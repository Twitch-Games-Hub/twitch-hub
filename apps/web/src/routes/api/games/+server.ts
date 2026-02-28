import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

async function getAuthHeaders(cookies: { get: (name: string) => string | undefined }) {
  const token = cookies.get('session');
  if (!token) error(401, 'Not authenticated');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export const GET: RequestHandler = async ({ cookies }) => {
  const headers = await getAuthHeaders(cookies);
  const serverUrl = env.PUBLIC_SERVER_URL || 'http://localhost:3001';
  const res = await fetch(`${serverUrl}/api/games`, { headers });
  if (!res.ok) error(res.status, 'Failed to fetch games');
  return json(await res.json());
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const headers = await getAuthHeaders(cookies);
  const body = await request.json();
  const serverUrl = env.PUBLIC_SERVER_URL || 'http://localhost:3001';
  const res = await fetch(`${serverUrl}/api/games`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) error(res.status, 'Failed to create game');
  return json(await res.json());
};
