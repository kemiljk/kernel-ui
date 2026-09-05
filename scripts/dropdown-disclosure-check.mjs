import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium, webkit } from 'playwright';
const css = ['packages/styles/src/tokens.css','packages/styles/src/reset.css','packages/elements/dist/kernel.css'].map(p=>readFileSync(p,'utf8')).join('\n');
const js = readFileSync('packages/elements/dist/index.js','utf8');
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>${css} body { min-height:2000px } .rail { position:fixed; top:20px; right:24px; z-index:2 }</style><button id="outside">Outside</button><div class="rail"><kernel-dropdown-menu presentation="disclosure" align="end"><summary slot="trigger">Menu</summary><kernel-menu-item href="#home">Home</kernel-menu-item><kernel-menu-item disabled>Disabled</kernel-menu-item><kernel-menu-item href="#work">Work</kernel-menu-item></kernel-dropdown-menu></div>`);
    await page.addScriptTag({type:'module', content:js});
    const details = page.locator('details'), summary = page.locator('summary'), menu = page.locator('[role="menu"]');
    await details.waitFor({state:'attached'});
    for (let cycle=0;cycle<3;cycle++) {
      for (const open of [true,false]) {
        const samples = await details.evaluate(async (d, open) => {
          d.querySelector('summary').click();
          const samples=[]; const start=performance.now();
          while(performance.now()-start < 350) {
            await new Promise(requestAnimationFrame);
            const disclosure = getComputedStyle(d,'::details-content');
            samples.push({open:d.open,opacity:Number(disclosure.opacity),visibility:disclosure.contentVisibility});
          }
          return samples;
        },open);
        assert.equal(samples.at(-1).open,open);
        assert.equal(samples.at(-1).visibility,open?'visible':'hidden');
        assert(samples.some(s=>s.opacity>0 && s.opacity<1),`${engine.name()} cycle ${cycle} ${open?'open':'close'} must animate`);
        assert.equal(samples.at(-1).opacity,open?1:0);
      }
    }
    // Touch can transiently blur an item before summary's native click.
    // That blur must not close first and turn the same tap into a reopen.
    await summary.tap(); await page.waitForTimeout(250);
    await page.evaluate(()=>document.activeElement.blur());
    await summary.tap(); await page.waitForTimeout(250);
    assert.equal(await details.getAttribute('open'),null);
    await summary.tap(); await page.waitForTimeout(250);
    assert.equal(await page.locator(':focus').textContent(),'Home');
    await page.keyboard.press('ArrowDown'); assert.equal(await page.locator(':focus').textContent(),'Work');
    await page.keyboard.press('Escape'); assert.equal(await summary.evaluate(e=>e===document.activeElement),true);
    await summary.click(); await page.waitForTimeout(250); await menu.getByRole('menuitem',{name:'Work'}).click();
    assert.equal(await details.getAttribute('open'),null);
    assert.equal(await page.evaluate(()=>location.hash),'#work');
    await summary.click(); await page.waitForTimeout(250); await page.locator('#outside').click();
    assert.equal(await details.getAttribute('open'),null);
    await page.emulateMedia({reducedMotion:'reduce'}); await summary.click(); await page.waitForTimeout(40);
    assert.equal(await details.evaluate(e=>e.getAnimations({subtree:true}).length),0);
    assert.equal(await menu.getAttribute('popover'),null);
    await page.evaluate(()=>scrollTo(0,200)); assert.equal(await page.evaluate(()=>scrollY),200);
    // Reconnecting the custom element must restore dismissal listeners.
    await page.evaluate(()=>{const host=document.querySelector('kernel-dropdown-menu');const p=host.parentElement;host.remove();p.append(host)});
    await page.keyboard.press('Escape'); assert.equal(await details.getAttribute('open'),null);
    console.log(`${engine.name()}: repeated entry/exit, focus, disabled items, selection, dismissal, reduced motion, scrolling and reconnect passed`);
  } finally { await browser.close(); }
}
