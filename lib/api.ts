// Helper para fazer chamadas à API
const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080');
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || (typeof window !== 'undefined' ? window.location.origin.replace('http', 'ws').replace('https', 'wss') : 'ws://localhost:8081');

export function getApiUrl(path: string): string {
  // Se estiver em desenvolvimento ou a API_URL for diferente do origin, usar API_URL
  if (API_URL && API_URL !== window.location.origin) {
    return `${API_URL}${path}`;
  }
  return path;
}

export function getWsUrl(): string {
  return WS_URL;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const url = getApiUrl(path);
  
  const headers = { ...options.headers } as Record<string, string>;
  
  // Se o body não for FormData e o Content-Type não estiver definido, assume JSON
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Importante para cookies
    headers,
  });
  return response;
}

