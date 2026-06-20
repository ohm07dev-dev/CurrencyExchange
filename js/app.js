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

const MAX_CARD_FEE_PERCENT = 2.5;
const elements = getElements();

async function init() {
  bindEvents();
  setFeeControls(elements.feeEnabled.checked);
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

  elements.feeEnabled.addEventListener("change", () => {
    setFeeControls(elements.feeEnabled.checked);
    convertCurrency();
  });

  elements.feeRateInput.addEventListener("input", debounce(() => {
    clampFeeInput();
    convertCurrency();
  }, 250));
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
  const cardFeeEnabled = elements.feeEnabled.checked;
  const cardFeePercent = cardFeeEnabled ? clampFeeInput() : 0;

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
    const baseConvertedAmount = amount * rate;
    const convertedAmount = applyCardFee(baseConvertedAmount, cardFeePercent);

    renderResult(elements, {
      amount,
      baseConvertedAmount,
      convertedAmount,
      fromCurrency,
      toCurrency,
      rate,
      updatedAt,
      cardFeeEnabled,
      cardFeePercent
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

function setFeeControls(isEnabled) {
  elements.feeRateInput.disabled = !isEnabled;
  elements.feeRateField.classList.toggle("is-hidden", !isEnabled);
}

function applyCardFee(amount, feePercent) {
  return amount * (1 + feePercent / 100);
}

function clampFeeInput() {
  const rawFee = Number(elements.feeRateInput.value);
  const fee = Number.isFinite(rawFee) ? rawFee : 0;
  const clampedFee = Math.min(Math.max(fee, 0), MAX_CARD_FEE_PERCENT);

  if (String(elements.feeRateInput.value) !== String(clampedFee)) {
    elements.feeRateInput.value = clampedFee;
  }

  return clampedFee;
}

function debounce(callback, delay) {
  let timerId;

  return (...args) => {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(() => callback(...args), delay);
  };
}

init();
