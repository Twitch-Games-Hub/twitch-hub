import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthHeaders } from '$lib/server/auth';
import { SERVER_URL } from '$lib/server/config';

export const POST: RequestHandler = async ({ params, request, cookies }) => {
  const headers = getAuthHeaders(cookies);
  const body = await request.json();
  const res = await fetch(`${SERVER_URL}/api/explore/${params.gameId}/rate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) error(res.status, 'Failed to rate game');
  return json(await res.json());
};

export const DELETE: RequestHandler = async ({ params, cookies }) => {
  const headers = getAuthHeaders(cookies);
  const res = await fetch(`${SERVER_URL}/api/explore/${params.gameId}/rate`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) error(res.status, 'Failed to remove rating');
  return json(await res.json());
};
