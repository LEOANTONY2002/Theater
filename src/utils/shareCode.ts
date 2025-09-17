// Utility to generate and parse compact watchlist share codes without external deps
// Format (v1): THTR1:<name_b64url>;<entries>
// entries => comma-separated list of tokens: `${type}${idBase36}` where type is 'm' or 't'
// Example: THTR1:TXkgTGlzdA; m2s9,m3g4,t1yz

function toBase64Url(input: string): string {
  const b64 = typeof Buffer !== 'undefined'
    ? Buffer.from(input, 'utf8').toString('base64')
    : (globalThis as any).btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
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
  return `THTR1:${nameB64};${tokens}`;
}

export function parseWatchlistCode(code: string): { name: string; items: MinimalWatchlistItem[] } | null {
  if (!code) return null;
  const trimmed = code.trim();
  if (!trimmed.startsWith('THTR1:')) return null;
  const rest = trimmed.slice('THTR1:'.length);
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
