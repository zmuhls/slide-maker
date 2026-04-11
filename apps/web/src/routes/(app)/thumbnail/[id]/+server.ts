import { env } from '$env/dynamic/public';
import type { RequestHandler } from './$types';

const API_URL = env.PUBLIC_API_URL ?? 'http://localhost:3001';

export const GET: RequestHandler = async ({ params, request }) => {
  const res = await fetch(`${API_URL}/api/decks/${params.id}/thumbnail`, {
    headers: {
      cookie: request.headers.get('cookie') || '',
    },
  });

  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'text/html',
      'Cache-Control': res.headers.get('Cache-Control') || 'private, max-age=60',
    },
  });
};
