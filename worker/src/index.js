const API_ORIGIN = 'https://developer-lostark.game.onstove.com';
const ROUTES = [
  /^\/characters\/[^/]+\/siblings$/,
  /^\/armories\/characters\/[^/]+\/profiles$/,
];

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function jsonError(message, status, origin) {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);
    if (!origin) return new Response('Forbidden', { status: 403 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (request.method !== 'GET') return jsonError('Method not allowed', 405, origin);

    const url = new URL(request.url);
    let path;
    try { path = decodeURI(url.pathname); } catch { return jsonError('잘못된 경로입니다', 400, origin); }
    if (path.length > 120 || !ROUTES.some(pattern => pattern.test(path))) {
      return jsonError('허용되지 않은 API 경로입니다', 404, origin);
    }

    let upstream;
    try {
      upstream = await fetch(API_ORIGIN + url.pathname, {
        headers: { accept: 'application/json', authorization: 'bearer ' + env.LOSTARK_API_KEY },
        cf: {
          cacheEverything: true,
          cacheTtlByStatus: { '200-299': 60, '400-599': 0 },
        },
      });
    } catch {
      return jsonError('로스트아크 API에 연결할 수 없습니다', 502, origin);
    }

    const headers = new Headers(corsHeaders(origin));
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json; charset=utf-8');
    headers.set('Cache-Control', 'public, max-age=30');
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};
