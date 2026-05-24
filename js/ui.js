let currencyOptions = [];

export function getElements() {
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
    rateInfo: document.querySelector("#rate-info"),
    statusMessage: document.querySelector("#status-message")
  };
}

export function renderCurrencyOptions(select, currencies, selectedCode) {
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

export function renderCurrencyPickers(elements) {
  renderCurrencyPicker(elements.fromPicker, elements.fromSelect);
  renderCurrencyPicker(elements.toPicker, elements.toSelect);

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".currency-picker")) {
      closePickers();
    }
  });
}

export function setLoading(elements, isLoading) {
  elements.swapButton.disabled = isLoading;
  elements.fromPicker.querySelector(".currency-picker__button").disabled = isLoading;
  elements.toPicker.querySelector(".currency-picker__button").disabled = isLoading;
}

export function showStatus(elements, message, type = "info") {
  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.toggle("is-error", type === "error");
}

export function renderResult(elements, result) {
  const amount = formatNumber(result.amount);
  const convertedAmount = formatNumber(result.convertedAmount);
  const rate = formatNumber(result.rate, 6);

  elements.convertedOutput.value = convertedAmount;
  elements.convertedOutput.textContent = convertedAmount;
  elements.rateInfo.textContent = `${amount} ${result.fromCurrency} = ${convertedAmount} ${result.toCurrency} | 1 ${result.fromCurrency} = ${rate} ${result.toCurrency} | อัปเดตล่าสุด ${formatDate(result.updatedAt)}`;
}

export function clearResult(elements) {
  elements.convertedOutput.value = "";
  elements.convertedOutput.textContent = "-";
}

export function syncCurrencyDisplay(elements) {
  elements.fromSymbol.textContent = getSelectedCurrency(elements.fromSelect)?.symbol || elements.fromSelect.value;
  elements.toSymbol.textContent = getSelectedCurrency(elements.toSelect)?.symbol || elements.toSelect.value;
  updateCurrencyPicker(elements.fromPicker, elements.fromSelect);
  updateCurrencyPicker(elements.toPicker, elements.toSelect);
}

export function swapCurrencyValues(elements) {
  const previousFrom = elements.fromSelect.value;
  const previousConvertedAmount = elements.convertedOutput.value.replace(/,/g, "");

  elements.fromSelect.value = elements.toSelect.value;
  elements.toSelect.value = previousFrom;

  if (previousConvertedAmount) {
    elements.amountInput.value = previousConvertedAmount;
  }

  syncCurrencyDisplay(elements);
  clearResult(elements);
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

  button.addEventListener("click", () => {
    togglePicker(picker);
  });

  button.addEventListener("keydown", (event) => {
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      openPicker(picker);
      search.value = event.key;
      filterCurrencyOptions(picker, event.key);
      search.focus();
    }
  });

  search.addEventListener("input", () => {
    filterCurrencyOptions(picker, search.value);
  });

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

function formatNumber(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits
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
