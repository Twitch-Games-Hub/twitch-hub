import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthHeaders } from '$lib/server/auth';
import { SERVER_URL } from '$lib/server/config';

export const POST: RequestHandler = async ({ params, cookies }) => {
  const headers = getAuthHeaders(cookies);
  const res = await fetch(`${SERVER_URL}/api/explore/${params.gameId}/save`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) error(res.status, 'Failed to save game');
  return json(await res.json());
};

export const DELETE: RequestHandler = async ({ params, cookies }) => {
  const headers = getAuthHeaders(cookies);
  const res = await fetch(`${SERVER_URL}/api/explore/${params.gameId}/save`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) error(res.status, 'Failed to unsave game');
  return json(await res.json());
};
