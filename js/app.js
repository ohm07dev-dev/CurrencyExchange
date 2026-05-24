import { DEFAULT_FROM_CURRENCY, DEFAULT_TO_CURRENCY } from "./config.js";
import { getCurrencyOptions, getExchangeRate } from "./api.js";
import {
  getElements,
  clearResult,
  renderCurrencyOptions,
  renderCurrencyPickers,
  renderResult,
  setLoading,
  showStatus,
  swapCurrencyValues,
  syncCurrencyDisplay
} from "./ui.js";

const elements = getElements();

async function init() {
  bindEvents();
  await setupCurrencySelectors();
  await convertCurrency();
}

function bindEvents() {
  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    convertCurrency();
  });

  elements.swapButton.addEventListener("click", async () => {
    swapCurrencyValues(elements);
    await convertCurrency();
  });

  elements.fromSelect.addEventListener("change", convertCurrency);
  elements.toSelect.addEventListener("change", convertCurrency);
  elements.amountInput.addEventListener("input", debounce(convertCurrency, 350));
}

async function setupCurrencySelectors() {
  const currencies = await getCurrencyOptions();
  renderCurrencyOptions(elements.fromSelect, currencies, DEFAULT_FROM_CURRENCY);
  renderCurrencyOptions(elements.toSelect, currencies, DEFAULT_TO_CURRENCY);
  renderCurrencyPickers(elements);
  syncCurrencyDisplay(elements);
}

async function convertCurrency() {
  const amount = Number(elements.amountInput.value);
  const fromCurrency = elements.fromSelect.value;
  const toCurrency = elements.toSelect.value;

  syncCurrencyDisplay(elements);

  if (elements.amountInput.value === "") {
    clearResult(elements);
    showStatus(elements, "กรอกจำนวนเงินเพื่อแปลงสกุลเงิน");
    return;
  }

  if (!Number.isFinite(amount) || amount < 0) {
    clearResult(elements);
    showStatus(elements, "กรุณากรอกจำนวนเงินเป็นตัวเลขตั้งแต่ 0 ขึ้นไป", "error");
    return;
  }

  setLoading(elements, true);
  showStatus(elements, "กำลังดึงข้อมูลอัตราแลกเปลี่ยนล่าสุด...");

  try {
    const { rate, updatedAt } = await getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = amount * rate;

    renderResult(elements, {
      amount,
      convertedAmount,
      fromCurrency,
      toCurrency,
      rate,
      updatedAt
    });

    showStatus(elements, "");
  } catch (error) {
    console.error(error);
    clearResult(elements);
    showStatus(
      elements,
      "ไม่สามารถดึงข้อมูลอัตราแลกเปลี่ยนได้ในขณะนี้ กรุณาตรวจสอบอินเทอร์เน็ตหรือทดลองใหม่อีกครั้ง",
      "error"
    );
  } finally {
    setLoading(elements, false);
  }
}

function debounce(callback, delay) {
  let timerId;

  return (...args) => {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(() => callback(...args), delay);
  };
}

init();
