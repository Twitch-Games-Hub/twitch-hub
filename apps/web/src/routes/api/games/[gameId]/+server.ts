import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

async function getAuthHeaders(cookies: { get: (name: string) => string | undefined }) {
  const token = cookies.get('session');
  if (!token) error(401, 'Not authenticated');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export const GET: RequestHandler = async ({ params, cookies }) => {
  const headers = await getAuthHeaders(cookies);
  const serverUrl = env.PUBLIC_SERVER_URL || 'http://localhost:3001';
  const res = await fetch(`${serverUrl}/api/games/${params.gameId}`, { headers });
  if (!res.ok) error(res.status, 'Failed to fetch game');
  return json(await res.json());
};

export const PUT: RequestHandler = async ({ params, request, cookies }) => {
  const headers = await getAuthHeaders(cookies);
  const body = await request.json();
  const serverUrl = env.PUBLIC_SERVER_URL || 'http://localhost:3001';
  const res = await fetch(`${serverUrl}/api/games/${params.gameId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) error(res.status, 'Failed to update game');
  return json(await res.json());
};

export const DELETE: RequestHandler = async ({ params, cookies }) => {
  const headers = await getAuthHeaders(cookies);
  const serverUrl = env.PUBLIC_SERVER_URL || 'http://localhost:3001';
  const res = await fetch(`${serverUrl}/api/games/${params.gameId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) error(res.status, 'Failed to delete game');
  return json({ success: true });
};
