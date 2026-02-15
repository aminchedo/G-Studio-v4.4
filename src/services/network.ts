import { API_BASE } from '@/config/api';

export async function safeFetch(input: RequestInfo, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} - ${text}`);
    }
    return res;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') {
      throw new Error('Backend timeout (safeFetch)');
    }
    throw err;
  }
}
