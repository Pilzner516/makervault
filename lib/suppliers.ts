import * as WebBrowser from 'expo-web-browser';

const AMAZON_TAG = process.env.AMAZON_ASSOCIATE_TAG ?? '';

interface SupplierConfig {
  name: string;
  displayName: string;
  color: string;
  buildUrl: (productUrl: string, mpn: string) => string;
  searchUrl: (query: string) => string;
}

export const SUPPLIER_CONFIGS: Record<string, SupplierConfig> = {
  amazon: {
    name: 'amazon',
    displayName: 'Amazon',
    color: '#FF9900',
    buildUrl: (url, _mpn) =>
      AMAZON_TAG ? `${url}${url.includes('?') ? '&' : '?'}tag=${AMAZON_TAG}` : url,
    searchUrl: (q) =>
      `https://www.amazon.com/s?k=${encodeURIComponent(q)}${AMAZON_TAG ? `&tag=${AMAZON_TAG}` : ''}`,
  },
  digikey: {
    name: 'digikey',
    displayName: 'DigiKey',
    color: '#CC0000',
    buildUrl: (url, _mpn) =>
      `${url}${url.includes('?') ? '&' : '?'}utm_source=makervault`,
    searchUrl: (q) =>
      `https://www.digikey.com/en/products/result?keywords=${encodeURIComponent(q)}`,
  },
  mouser: {
    name: 'mouser',
    displayName: 'Mouser',
    color: '#004B87',
    buildUrl: (url, _mpn) =>
      `${url}${url.includes('?') ? '&' : '?'}utm_source=makervault`,
    searchUrl: (q) =>
      `https://www.mouser.com/Search/Refine?Keyword=${encodeURIComponent(q)}`,
  },
  adafruit: {
    name: 'adafruit',
    displayName: 'Adafruit',
    color: '#000000',
    buildUrl: (url, _mpn) => url,
    searchUrl: (q) =>
      `https://www.adafruit.com/search?q=${encodeURIComponent(q)}`,
  },
  aliexpress: {
    name: 'aliexpress',
    displayName: 'AliExpress',
    color: '#FF4747',
    buildUrl: (_url, mpn) =>
      `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(mpn)}`,
    searchUrl: (q) =>
      `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(q)}`,
  },
};

export function buildAffiliateUrl(
  supplierName: string,
  productUrl: string,
  mpn: string
): string {
  const key = supplierName.toLowerCase().replace(/\s+/g, '');
  const config = SUPPLIER_CONFIGS[key];
  if (!config) return productUrl;
  return config.buildUrl(productUrl, mpn);
}

export function getSearchUrl(supplierName: string, query: string): string {
  const key = supplierName.toLowerCase().replace(/\s+/g, '');
  const config = SUPPLIER_CONFIGS[key];
  if (!config) return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  return config.searchUrl(query);
}

export function getSupplierColor(supplierName: string): string {
  const key = supplierName.toLowerCase().replace(/\s+/g, '');
  return SUPPLIER_CONFIGS[key]?.color ?? '#71717a';
}

export async function openSupplierPage(url: string): Promise<void> {
  await WebBrowser.openBrowserAsync(url);
}

export function groupBySupplier<T extends { supplier: string }>(
  items: T[]
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = item.supplier.toLowerCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}
