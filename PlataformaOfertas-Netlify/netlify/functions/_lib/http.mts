export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export function json(data: unknown, status = 200, extraHeaders: Record<string,string> = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...extraHeaders } });
}

export function publicJson(data: unknown, maxAge = 60) {
  return Response.json(data, { headers: { 'Cache-Control': `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 5}` } });
}

export async function bodyJson<T = Record<string, unknown>>(req: Request, maxBytes = 64_000): Promise<T> {
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new HttpError(413, 'Requisição muito grande.');
  try { return JSON.parse(text || '{}') as T; } catch { throw new HttpError(400, 'JSON inválido.'); }
}

export function handleError(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  console.error('Unhandled API error:', error instanceof Error ? error.message : 'unknown error');
  return json({ error: 'Ocorreu um erro interno. Tente novamente.' }, 500);
}
