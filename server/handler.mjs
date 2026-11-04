import { api } from './api.mjs';

export async function handleApi(request, ip = 'unknown') {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
  });
  try {
    const origin = process.env.APP_ORIGIN || 'http://localhost:5173';
    if (
      (process.env.NETLIFY || globalThis.Netlify) &&
      (!process.env.APP_ORIGIN || !origin.startsWith('https://'))
    )
      return Response.json(
        { error: 'Set APP_ORIGIN to this site’s HTTPS origin in Netlify and redeploy.' },
        { status: 503, headers },
      );
    if (
      request.method === 'POST' &&
      request.headers.has('cookie') &&
      request.headers.get('origin') !== origin
    )
      return Response.json({ error: 'This origin is not allowed.' }, { status: 403, headers });
    if (!['GET', 'POST'].includes(request.method))
      return Response.json({ error: 'Method not allowed.' }, { status: 405, headers });
    const nodeRequest = {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers),
      socket: { remoteAddress: ip },
      async *[Symbol.asyncIterator]() {
        if (!request.body) return;
        for await (const chunk of request.body) yield Buffer.from(chunk);
      },
    };
    const response = {
      setHeader(name, value) {
        headers.delete(name);
        for (const item of Array.isArray(value) ? value : [value]) headers.append(name, item);
      },
    };
    const result = await api(nodeRequest, new URL(request.url).pathname, response);
    if (result?.redirect) {
      headers.set('Location', result.redirect);
      return new Response(null, { status: 302, headers });
    }
    return Response.json(result, { headers });
  } catch (error) {
    return Response.json(
      {
        error: error.status
          ? error.message
          : 'The operation could not finish. Retry safely or check server configuration.',
      },
      { status: error.status || 500, headers },
    );
  }
}
