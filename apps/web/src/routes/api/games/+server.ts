import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthHeaders } from '$lib/server/auth';
import { SERVER_URL } from '$lib/server/config';

export const GET: RequestHandler = async ({ cookies }) => {
  const headers = getAuthHeaders(cookies);
  const res = await fetch(`${SERVER_URL}/api/games`, { headers });
  if (!res.ok) error(res.status, 'Failed to fetch games');
  return json(await res.json());
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const headers = getAuthHeaders(cookies);
  const body = await request.json();
  const res = await fetch(`${SERVER_URL}/api/games`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) error(res.status, 'Failed to create game');
  return json(await res.json());
};
