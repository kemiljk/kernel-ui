/** Browser regression check for native select enhancement and its CSS fallback.
 * Build both packages first. Run with PLAYWRIGHT_CHANNEL=chrome to use Chrome.
 * The fallback removes the enhancement query; it does not emulate another engine.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { createRequire } from "node:module";
const require = createRequire(
  new URL("../packages/react/package.json", import.meta.url),
);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
import { Select } from "../packages/react/dist/index.js";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const tokens =
  read("packages/styles/src/tokens.css") +
  read("packages/styles/src/reset.css");
const options =
  '<option value="">Choose a country</option><optgroup label="Countries"><option value="uk">United Kingdom</option><option value="us">United States</option><option value="de" disabled>Germany</option></optgroup>';
const reactHTML = renderToStaticMarkup(
  React.createElement(Select, {
    label: "Country",
    name: "country",
    required: true,
    defaultValue: "",
    dangerouslySetInnerHTML: { __html: options },
  }),
);
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
});
try {
  for (const pkg of ["react", "elements"]) {
    const css = tokens + read(`packages/${pkg}/dist/kernel.css`);
    const measurements = [];
    for (const enhanced of [false, true]) {
      const page = await browser.newPage();
      const styles = enhanced
        ? css
        : css
            .replaceAll(
              "@supports (appearance:base-select) and selector(::picker(select))",
              "@supports (kernel-test:unsupported)",
            )
            .replaceAll(
              "@supports (appearance: base-select) and selector(::picker(select))",
              "@supports (kernel-test: unsupported)",
            );
      await page.setContent(
        `<style>${styles}</style><main style="padding:40px;width:320px"><form>${pkg === "react" ? reactHTML : `<kernel-select label="Country" name="country" required>${options}</kernel-select>`}<button type="reset">Reset</button></form></main>`,
      );
      if (pkg === "elements")
        await page.addScriptTag({
          content: read("packages/elements/dist/index.js"),
          type: "module",
        });
      const select = page.locator("select");
      await select.waitFor();
      assert.equal(
        await select.evaluate((e) => getComputedStyle(e).appearance),
        enhanced ? "base-select" : "none",
      );
      measurements.push(
        await select.evaluate((e) => {
          const s = getComputedStyle(e);
          return {
            height: e.getBoundingClientRect().height,
            width: e.getBoundingClientRect().width,
            border: s.border,
            color: s.color,
            background: s.backgroundColor,
            radius: s.borderRadius,
            font: s.font,
          };
        }),
      );
      assert.equal(await select.evaluate((e) => e.checkValidity()), false);
      await select.selectOption("uk");
      assert.equal(
        await page
          .locator("form")
          .evaluate((e) => new FormData(e).get("country")),
        "uk",
      );
      assert.equal(await select.evaluate((e) => e.checkValidity()), true);
      if (enhanced) {
        await select.click();
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
        assert.equal(await select.inputValue(), "us");
        await select.click();
        await page.keyboard.press("Escape");
        assert.equal(await select.inputValue(), "us");
      }
      await page.getByRole("button", { name: "Reset" }).click();
      assert.equal(await select.inputValue(), "");
      await select.evaluate((e) => (e.disabled = true));
      assert.equal(
        await page
          .locator("form")
          .evaluate((e) => new FormData(e).has("country")),
        false,
      );
      await select.evaluate((e) => {
        e.disabled = false;
        e.multiple = true;
        e.size = 4;
      });
      assert.equal(
        await select.evaluate((e) => getComputedStyle(e).appearance),
        "none",
      );
      await select.evaluate((e) => {
        e.multiple = false;
        e.size = 4;
      });
      assert.equal(
        await select.evaluate((e) => getComputedStyle(e).appearance),
        "none",
      );
      await page.close();
    }
    assert.deepEqual(
      measurements[1],
      measurements[0],
      `${pkg}: closed-control appearance must match fallback`,
    );
    console.log(
      `${pkg}: native picker, keyboard, reset, form data, validation, disabled, listboxes, and fallback appearance passed`,
    );
  }
} finally {
  await browser.close();
}
