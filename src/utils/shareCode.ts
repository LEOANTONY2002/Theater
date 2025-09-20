// Utility to generate and parse compact share codes without external deps
// Formats (current):
// - Watchlist: THTRW:<name_b64url>;<entries>
// - Filter:    THTRF:<name_b64url>;<type_char>;<params_b64url>
// entries => comma-separated list of tokens: `${type}${idBase36}` where type is 'm' or 't'
// Example: THTR1:TXkgTGlzdA; m2s9,m3g4,t1yz

function toBase64Url(input: string): string {
  const b64 = typeof Buffer !== 'undefined'
    ? Buffer.from(input, 'utf8').toString('base64')
    : (globalThis as any).btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// ===== Filters =====
// Format: THTRF:<name_b64url>;<type_char>;<params_b64url>
// type_char: 'a' | 'm' | 't' for all/movie/tv
export type MinimalFilter = {
  name: string;
  type: 'all' | 'movie' | 'tv';
  params: Record<string, any>;
};

export function generateFilterCode(filter: MinimalFilter): string {
  const safeName = (filter.name || 'Filter').trim().slice(0, 60);
  const nameB64 = toBase64Url(safeName);
  const typeChar = filter.type === 'movie' ? 'm' : filter.type === 'tv' ? 't' : 'a';
  const paramsJson = JSON.stringify(filter.params || {});
  const paramsB64 = toBase64Url(paramsJson);
  return `THTRF:${nameB64};${typeChar};${paramsB64}`;
}

export function parseFilterCode(code: string): MinimalFilter | null {
  if (!code) return null;
  let trimmed = code.trim();
  // Accept URL forms: https://lacurations.vercel.app/theater?redirect=filtercode&code=...
  if (/^https?:\/\//i.test(trimmed)) {
    const parsed = extractCodeAndRedirectFromUrl(trimmed);
    if (parsed && parsed.redirect === 'filtercode' && parsed.code) {
      trimmed = parsed.code.trim();
    }
  }
  if (!trimmed.startsWith('THTRF:')) return null;
  const rest = trimmed.slice('THTRF:'.length);
  const [nameB64, typeChar = 'a', paramsB64 = ''] = rest.split(';');
  if (!nameB64) return null;
  let name: string;
  try {
    name = fromBase64Url(nameB64);
  } catch {
    name = 'Imported Filter';
  }
  let params: Record<string, any> = {};
  if (paramsB64) {
    try {
      const json = fromBase64Url(paramsB64);
      params = JSON.parse(json);
    } catch {
      params = {};
    }
  }
  const type: 'all' | 'movie' | 'tv' = typeChar === 'm' ? 'movie' : typeChar === 't' ? 'tv' : 'all';
  return { name: name || 'Imported Filter', type, params };
}

// ===== Helpers =====
// Parse URLs both in web and RN without relying on URL class availability
function extractCodeAndRedirectFromUrl(input: string): { redirect: string | null; code: string | null } | null {
  try {
    // Extract query part
    const qIndex = input.indexOf('?');
    if (qIndex === -1) return null;
    const query = input.slice(qIndex + 1);
    const params: Record<string, string> = {};
    for (const pair of query.split('&')) {
      const [kRaw, vRaw = ''] = pair.split('=');
      const k = decodeURIComponent(kRaw || '').toLowerCase();
      const v = decodeURIComponent(vRaw || '');
      if (k) params[k] = v;
    }
    return {
      redirect: (params['redirect'] || '').toLowerCase() || null,
      code: params['code'] || null,
    };
  } catch {
    return null;
  }
}

function fromBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64, 'base64').toString('utf8');
  }
  const str = (globalThis as any).atob(b64);
  try {
    return decodeURIComponent(escape(str));
  } catch {
    return str;
  }
}

export type MinimalWatchlistItem = { id: number; type: 'movie' | 'tv' };

export function generateWatchlistCode(
  name: string,
  items: MinimalWatchlistItem[],
): string {
  const safeName = (name || 'Watchlist').trim().slice(0, 60);
  const nameB64 = toBase64Url(safeName);
  const tokens = items
    .map(it => `${it.type === 'movie' ? 'm' : 't'}${it.id.toString(36)}`)
    .join(',');
  return `THTRW:${nameB64};${tokens}`;
}

export function parseWatchlistCode(code: string): { name: string; items: MinimalWatchlistItem[] } | null {
  if (!code) return null;
  let trimmed = code.trim();
  // Accept URL forms: https://lacurations.vercel.app/theater?redirect=watchlistcode&code=...
  if (/^https?:\/\//i.test(trimmed)) {
    const parsed = extractCodeAndRedirectFromUrl(trimmed);
    if (parsed && parsed.redirect === 'watchlistcode' && parsed.code) {
      trimmed = parsed.code.trim();
    }
  }
  if (!trimmed.startsWith('THTRW:')) return null;
  const rest = trimmed.slice('THTRW:'.length);
  const [nameB64, tokenStr = ''] = rest.split(';');
  if (!nameB64) return null;
  let name: string;
  try {
    name = fromBase64Url(nameB64);
  } catch {
    name = 'Imported Watchlist';
  }
  const items: MinimalWatchlistItem[] = [];
  if (tokenStr) {
    for (const tok of tokenStr.split(',')) {
      if (!tok) continue;
      const typeChar = tok[0];
      const idPart = tok.slice(1);
      if (!idPart) continue;
      const id = parseInt(idPart, 36);
      if (!Number.isFinite(id)) continue;
      if (typeChar === 'm') items.push({ id, type: 'movie' });
      else if (typeChar === 't') items.push({ id, type: 'tv' });
    }
  }
  return { name: name || 'Imported Watchlist', items };
}
