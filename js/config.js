export const API_SOURCES = [
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1",
  "https://latest.currency-api.pages.dev/v1"
];

export const DEFAULT_CURRENCIES = [
  "USD",
  "EUR",
  "JPY",
  "GBP",
  "KRW",
  "THB",
  "AUD",
  "CAD",
  "CHF",
  "CNY",
  "HKD",
  "SGD",
  "INR",
  "MYR",
  "IDR",
  "PHP",
  "VND"
];

export const CURRENCY_META = {
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

export const DEFAULT_FROM_CURRENCY = "USD";
export const DEFAULT_TO_CURRENCY = "THB";
