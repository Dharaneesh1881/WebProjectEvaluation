const DEFAULT_ALLOWED_CDN_DOMAINS = [
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
  'cdn.tailwindcss.com',
  'code.jquery.com',
  'ajax.googleapis.com',
  'bootstrapcdn.com',
  'stackpath.bootstrapcdn.com',
  'maxcdn.bootstrapcdn.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

function normalizeDomain(domain) {
  return String(domain || '')
    .trim()
    .toLowerCase()
    .replace(/^\*\./, '')
    .replace(/\.+$/, '');
}

export function normalizeAllowedDomains(domains = []) {
  const normalized = new Set();

  for (const domain of domains) {
    const clean = normalizeDomain(domain);
    if (clean) normalized.add(clean);
  }

  return Array.from(normalized);
}

export function resolveAllowedDomains(assignmentDomains = [], { includeDefaults = true } = {}) {
  return normalizeAllowedDomains([
    ...(includeDefaults ? DEFAULT_ALLOWED_CDN_DOMAINS : []),
    ...(Array.isArray(assignmentDomains) ? assignmentDomains : [])
  ]);
}

function isAllowedHttpUrl(url, allowedDomains) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  return allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

export function isRequestAllowed(url, allowedDomains = []) {
  if (url.startsWith('file://') || url.startsWith('data:')) {
    return true;
  }

  return isAllowedHttpUrl(url, allowedDomains);
}

export async function enableRequestWhitelist(page, allowedDomains = []) {
  const normalizedDomains = normalizeAllowedDomains(allowedDomains);

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (isRequestAllowed(req.url(), normalizedDomains)) {
      req.continue();
      return;
    }

    req.abort('blockedbyclient').catch(() => {});
  });
}

export { DEFAULT_ALLOWED_CDN_DOMAINS };
