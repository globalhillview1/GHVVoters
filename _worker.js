// _worker.js
const GAS_API = 'https://script.google.com/macros/s/AKfycby5tqQAlF7k3jfLs5sKkHjt3Er5qLUOJKrBIpXVHZYG4fjiahRqtKLE10drur2iXlB5Ow/exec';

function cors(h = new Headers()) {
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type');
  return h;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy /api and /api/...
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      // Handle preflight for JSON POSTs
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: cors() });
      }

      // Build upstream URL (preserve query)
      const upstream = new URL(GAS_API);
      for (const [k, v] of url.searchParams) upstream.searchParams.set(k, v);

      // Minimal, safe headers
      const headers = new Headers();
      headers.set('accept', 'application/json');
      const ct = request.headers.get('content-type');
      if (ct && request.method !== 'GET' && request.method !== 'HEAD') {
        headers.set('content-type', ct);
      }

      const res = await fetch(upstream.toString(), {
        method: request.method,
        headers,
        body: (request.method === 'GET' || request.method === 'HEAD') ? undefined : request.body,
        redirect: 'follow' // <— follow any 3xx from GAS
      });

      // Pass response through with CORS for the browser
      const outHeaders = cors(new Headers(res.headers));
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: outHeaders });
    }

    // Static assets
    return env.ASSETS.fetch(request);
  }
};
