import { API_SOURCES, CURRENCY_META, DEFAULT_CURRENCIES } from "./config.js";

const REQUEST_TIMEOUT_MS = 9000;

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

export async function getCurrencyOptions() {
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

export async function getExchangeRate(fromCurrency, toCurrency) {
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
