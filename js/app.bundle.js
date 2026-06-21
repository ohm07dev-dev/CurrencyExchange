(() => {
  const API_SOURCES = [
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1",
    "https://latest.currency-api.pages.dev/v1"
  ];

  const DEFAULT_CURRENCIES = [
    "USD", "EUR", "JPY", "GBP", "KRW", "THB", "AUD", "CAD", "CHF",
    "CNY", "HKD", "SGD", "INR", "MYR", "IDR", "PHP", "VND"
  ];

  const CURRENCY_META = {
    USD: { symbol: "$", flagCode: "us" },
    EUR: { symbol: "€", flagCode: "eu" },
    JPY: { symbol: "¥", flagCode: "jp" },
    GBP: { symbol: "£", flagCode: "gb" },
    KRW: { symbol: "₩", flagCode: "kr" },
    THB: { symbol: "฿", flagCode: "th" },
    AUD: { symbol: "A$", flagCode: "au" },
    CAD: { symbol: "C$", flagCode: "ca" },
    CHF: { symbol: "Fr", flagCode: "ch" },
    CNY: { symbol: "¥", flagCode: "cn" },
    HKD: { symbol: "HK$", flagCode: "hk" },
    SGD: { symbol: "S$", flagCode: "sg" },
    INR: { symbol: "₹", flagCode: "in" },
    MYR: { symbol: "RM", flagCode: "my" },
    IDR: { symbol: "Rp", flagCode: "id" },
    PHP: { symbol: "₱", flagCode: "ph" },
    VND: { symbol: "₫", flagCode: "vn" }
  };

  const DEFAULT_FROM_CURRENCY = "USD";
  const DEFAULT_TO_CURRENCY = "THB";
  const REQUEST_TIMEOUT_MS = 9000;
  const MAX_CARD_FEE_PERCENT = 2.5;
  let currencyOptions = [];
  let elements;

  async function fetchJson(url) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      return await response.json();
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function fetchFromSources(endpoint) {
    const errors = [];

    for (const source of API_SOURCES) {
      try {
        return await fetchJson(`${source}/${endpoint}`);
      } catch (error) {
        errors.push(error);
        console.warn(`Unable to fetch ${endpoint} from ${source}`, error);
      }
    }

    throw new Error(`All exchange-rate sources failed. Last error: ${errors.at(-1)?.message}`);
  }

  async function getCurrencyOptions() {
    try {
      const currencies = await fetchFromSources("currencies.min.json");

      return DEFAULT_CURRENCIES.map((code) => {
        const key = code.toLowerCase();
        return {
          code,
          name: currencies[key] || code,
          ...CURRENCY_META[code]
        };
      });
    } catch (error) {
      console.warn("Unable to fetch currency names. Falling back to currency codes.", error);

      return DEFAULT_CURRENCIES.map((code) => ({
        code,
        name: code,
        ...CURRENCY_META[code]
      }));
    }
  }

  async function getExchangeRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return {
        rate: 1,
        updatedAt: new Date().toISOString().slice(0, 10)
      };
    }

    const from = fromCurrency.toLowerCase();
    const to = toCurrency.toLowerCase();
    const data = await fetchFromSources(`currencies/${from}.min.json`);
    const rate = Number(data[from]?.[to]);

    if (!Number.isFinite(rate)) {
      throw new Error("API response does not include a valid exchange rate.");
    }

    return {
      rate,
      updatedAt: data.date
    };
  }

  function getElements() {
    return {
      form: document.querySelector("#converter-form"),
      amountInput: document.querySelector("#amount-input"),
      convertedOutput: document.querySelector("#converted-output"),
      fromSelect: document.querySelector("#from-currency"),
      toSelect: document.querySelector("#to-currency"),
      fromPicker: document.querySelector("#from-picker"),
      toPicker: document.querySelector("#to-picker"),
      fromSymbol: document.querySelector("#from-symbol"),
      toSymbol: document.querySelector("#to-symbol"),
      swapButton: document.querySelector("#swap-button"),
      feeEnabled: document.querySelector("#fee-enabled"),
      feeRateInput: document.querySelector("#fee-rate"),
      feeRateField: document.querySelector("#fee-rate-field"),
      themeToggle: document.querySelector("#theme-toggle"),
      rateInfo: document.querySelector("#rate-info"),
      statusMessage: document.querySelector("#status-message")
    };
  }

  function renderCurrencyOptions(select, currencies, selectedCode) {
    currencyOptions = currencies;

    const options = currencies.map(({ code, name, symbol }) => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = code;
      option.title = `${code} - ${capitalize(name)}`;
      option.dataset.symbol = symbol || code;
      option.selected = code === selectedCode;
      return option;
    });

    select.replaceChildren(...options);
  }

  function renderCurrencyPickers() {
    renderCurrencyPicker(elements.fromPicker, elements.fromSelect);
    renderCurrencyPicker(elements.toPicker, elements.toSelect);

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".currency-picker")) {
        closePickers();
      }
    });
  }

  function setLoading(isLoading) {
    elements.swapButton.disabled = isLoading;
    elements.fromPicker.querySelector(".currency-picker__button").disabled = isLoading;
    elements.toPicker.querySelector(".currency-picker__button").disabled = isLoading;
  }

  function setFeeControls(isEnabled) {
    elements.feeRateInput.disabled = !isEnabled;
    elements.feeRateField.classList.toggle("is-hidden", !isEnabled);
  }

  function showStatus(message, type = "info") {
    elements.statusMessage.textContent = message;
    elements.statusMessage.classList.toggle("is-error", type === "error");
  }

  function renderResult(result) {
    const amount = formatNumber(result.amount);
    const baseConvertedAmount = formatNumber(result.baseConvertedAmount);
    const convertedAmount = formatNumber(result.convertedAmount);
    const rate = formatNumber(result.rate, 6);

    elements.convertedOutput.value = convertedAmount;
    elements.convertedOutput.textContent = convertedAmount;

    if (result.cardFeeEnabled && result.cardFeePercent > 0) {
      elements.rateInfo.textContent = `1 ${result.fromCurrency} = ${rate} ${result.toCurrency} | ค่าธรรมเนียมบัตร ${formatCompactNumber(result.cardFeePercent)}% | อัปเดตล่าสุด ${formatDate(result.updatedAt)}`;
      return;
    }

    elements.rateInfo.textContent = `1 ${result.fromCurrency} = ${rate} ${result.toCurrency} | อัปเดตล่าสุด ${formatDate(result.updatedAt)}`;
  }

  function clearResult() {
    elements.convertedOutput.value = "";
    elements.convertedOutput.textContent = "-";
  }

  function syncCurrencyDisplay() {
    elements.fromSymbol.textContent = getSelectedCurrency(elements.fromSelect)?.symbol || elements.fromSelect.value;
    elements.toSymbol.textContent = getSelectedCurrency(elements.toSelect)?.symbol || elements.toSelect.value;
    updateCurrencyPicker(elements.fromPicker, elements.fromSelect);
    updateCurrencyPicker(elements.toPicker, elements.toSelect);
  }

  function swapCurrencyValues() {
    const previousFrom = elements.fromSelect.value;
    const previousConvertedAmount = elements.convertedOutput.value.replace(/,/g, "");

    elements.fromSelect.value = elements.toSelect.value;
    elements.toSelect.value = previousFrom;

    if (previousConvertedAmount) {
      elements.amountInput.value = previousConvertedAmount;
    }

    syncCurrencyDisplay();
    clearResult();
  }

  function renderCurrencyPicker(picker, select) {
    picker.innerHTML = `
      <button class="currency-picker__button" type="button" aria-haspopup="listbox" aria-expanded="false"></button>
      <div class="currency-picker__menu">
        <input class="currency-picker__search" type="search" placeholder="ค้นหา" aria-label="ค้นหาสกุลเงิน">
        <div class="currency-picker__options" role="listbox"></div>
        <p class="currency-picker__empty" hidden>ไม่พบสกุลเงิน</p>
      </div>
    `;

    const button = picker.querySelector(".currency-picker__button");
    const search = picker.querySelector(".currency-picker__search");
    const options = picker.querySelector(".currency-picker__options");

    currencyOptions.forEach((currency) => {
      const option = document.createElement("button");
      option.className = "currency-picker__option";
      option.type = "button";
      option.dataset.value = currency.code;
      option.dataset.search = `${currency.code} ${currency.name}`.toLowerCase();
      option.setAttribute("role", "option");
      option.innerHTML = `
        ${flagImage(currency)}
        <span class="currency-picker__code">${currency.code}</span>
        <span class="currency-picker__name">${capitalize(currency.name)}</span>
      `;
      option.addEventListener("click", () => {
        select.value = currency.code;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        closePickers();
      });
      options.append(option);
    });

    button.addEventListener("click", () => togglePicker(picker));
    button.addEventListener("keydown", (event) => {
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        openPicker(picker);
        search.value = event.key;
        filterCurrencyOptions(picker, event.key);
        search.focus();
      }
    });
    search.addEventListener("input", () => filterCurrencyOptions(picker, search.value));
    search.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closePickers();
        button.focus();
      }
    });

    filterCurrencyOptions(picker, "");
    updateCurrencyPicker(picker, select);
  }

  function updateCurrencyPicker(picker, select) {
    const currency = getSelectedCurrency(select);
    const button = picker.querySelector(".currency-picker__button");

    if (!currency || !button) {
      return;
    }

    button.innerHTML = `${flagImage(currency)}<span>${currency.code}</span><span class="currency-picker__chevron">⌄</span>`;

    picker.querySelectorAll(".currency-picker__option").forEach((option) => {
      const isSelected = option.dataset.value === currency.code;
      option.classList.toggle("is-selected", isSelected);
      option.setAttribute("aria-selected", String(isSelected));
    });
  }

  function togglePicker(picker) {
    if (picker.classList.contains("is-open")) {
      closePickers();
      return;
    }

    openPicker(picker);
  }

  function openPicker(picker) {
    closePickers();
    picker.classList.add("is-open");
    picker.querySelector(".currency-picker__button").setAttribute("aria-expanded", "true");
    window.setTimeout(() => picker.querySelector(".currency-picker__search").focus(), 0);
  }

  function closePickers() {
    document.querySelectorAll(".currency-picker.is-open").forEach((picker) => {
      picker.classList.remove("is-open");
      picker.querySelector(".currency-picker__button").setAttribute("aria-expanded", "false");
      picker.querySelector(".currency-picker__search").value = "";
      filterCurrencyOptions(picker, "");
    });
  }

  function filterCurrencyOptions(picker, query) {
    const normalizedQuery = query.trim().toLowerCase();
    let visibleCount = 0;

    picker.querySelectorAll(".currency-picker__option").forEach((option) => {
      const isMatch = option.dataset.search.includes(normalizedQuery);
      option.hidden = !isMatch;
      visibleCount += isMatch ? 1 : 0;
    });

    picker.querySelector(".currency-picker__empty").hidden = visibleCount > 0;
  }

  function flagImage(currency) {
    return `<img class="currency-flag" src="https://flagcdn.com/w40/${currency.flagCode}.png" alt="" loading="lazy">`;
  }

  function getSelectedCurrency(select) {
    return currencyOptions.find((currency) => currency.code === select.value);
  }

  async function init() {
    elements = getElements();
    bindEvents();
    initTheme();
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
      swapCurrencyValues();
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

    elements.themeToggle.addEventListener("change", () => {
      setTheme(elements.themeToggle.checked);
    });
  }

  function initTheme() {
    const savedTheme = window.localStorage.getItem("exchangeCurrencyTheme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const useDark = savedTheme ? savedTheme === "dark" : Boolean(prefersDark);
    elements.themeToggle.checked = useDark;
    setTheme(useDark, false);
  }

  function setTheme(useDark, shouldPersist = true) {
    document.body.classList.toggle("is-dark", useDark);

    if (shouldPersist) {
      window.localStorage.setItem("exchangeCurrencyTheme", useDark ? "dark" : "light");
    }
  }
  async function setupCurrencySelectors() {
    const currencies = await getCurrencyOptions();
    renderCurrencyOptions(elements.fromSelect, currencies, DEFAULT_FROM_CURRENCY);
    renderCurrencyOptions(elements.toSelect, currencies, DEFAULT_TO_CURRENCY);
    renderCurrencyPickers();
    syncCurrencyDisplay();
  }

  async function convertCurrency() {
    const amount = Number(elements.amountInput.value);
    const fromCurrency = elements.fromSelect.value;
    const toCurrency = elements.toSelect.value;
    const cardFeeEnabled = elements.feeEnabled.checked;
    const cardFeePercent = cardFeeEnabled ? clampFeeInput() : 0;

    syncCurrencyDisplay();

    if (elements.amountInput.value === "") {
      clearResult();
      showStatus("กรอกจำนวนเงินเพื่อแปลงสกุลเงิน");
      return;
    }

    if (!Number.isFinite(amount) || amount < 0) {
      clearResult();
      showStatus("กรุณากรอกจำนวนเงินเป็นตัวเลขตั้งแต่ 0 ขึ้นไป", "error");
      return;
    }

    setLoading(true);
    showStatus("กำลังดึงข้อมูลอัตราแลกเปลี่ยนล่าสุด...");

    try {
      const { rate, updatedAt } = await getExchangeRate(fromCurrency, toCurrency);
      const baseConvertedAmount = amount * rate;
      const convertedAmount = applyCardFee(baseConvertedAmount, cardFeePercent);

      renderResult({
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

      showStatus("");
    } catch (error) {
      console.error(error);
      clearResult();
      showStatus(
        "ไม่สามารถดึงข้อมูลอัตราแลกเปลี่ยนได้ในขณะนี้ กรุณาตรวจสอบอินเทอร์เน็ตหรือทดลองใหม่อีกครั้ง",
        "error"
      );
    } finally {
      setLoading(false);
    }
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

  function formatNumber(value, maximumFractionDigits = 2) {
    return new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits
    }).format(value);
  }

  function formatCompactNumber(value) {
    return new Intl.NumberFormat("th-TH", {
      maximumFractionDigits: 2
    }).format(value);
  }

  function formatDate(value) {
    if (!value) {
      return "ไม่ทราบเวลา";
    }

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(date);
  }

  function capitalize(value) {
    return value.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
