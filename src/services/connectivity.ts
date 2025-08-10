export async function checkInternet(timeoutMs: number = 5000): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Using a lightweight 204 endpoint commonly used for connectivity checks
    const res = await fetch('https://www.gstatic.com/generate_204', {
      method: 'GET',
      cache: 'no-store' as any,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    // Any successful fetch indicates connectivity
    return res.ok || (res.status >= 200 && res.status < 400);
  } catch (e) {
    clearTimeout(timeout);
    return false;
  }
}
