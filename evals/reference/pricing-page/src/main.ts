import "@kernelui-lib/styles";
import "@kernelui-lib/elements/styles.css";
import "@kernelui-lib/elements";
import "./index.css";

const YEARLY_DISCOUNT = 0.2;
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 });

const billing = document.querySelector<HTMLElement>("#billing")!;
const prices = document.querySelectorAll<HTMLElement>("[data-monthly]");

// `change` fires before the switch commits (it's cancelable), so the new
// state is `event.detail.checked`; the attribute still has the old one.
function render(yearly = billing.hasAttribute("checked")) {
  for (const price of prices) {
    const monthly = Number(price.dataset.monthly);
    price.textContent = currency.format(yearly ? monthly * (1 - YEARLY_DISCOUNT) : monthly);
    const per = price.nextElementSibling?.nextElementSibling ?? price.parentElement?.querySelector(".per");
    if (per) per.textContent = yearly ? "per month, billed yearly" : "per month";
  }
}

billing.addEventListener("change", (event) => render((event as CustomEvent<{ checked: boolean }>).detail.checked));
render();
