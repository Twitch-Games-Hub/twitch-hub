import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthHeaders } from '$lib/server/auth';
import { SERVER_URL } from '$lib/server/config';
import * as Sentry from '@sentry/sveltekit';

export const GET: RequestHandler = async ({ params, cookies }) => {
  const headers = getAuthHeaders(cookies);
  const res = await fetch(`${SERVER_URL}/api/games/${params.gameId}`, { headers });
  if (!res.ok) {
    Sentry.logger.error('Failed to fetch game', { status: res.status, gameId: params.gameId });
    error(res.status, 'Failed to fetch game');
  }
  return json(await res.json());
};

export const PUT: RequestHandler = async ({ params, request, cookies }) => {
  const headers = getAuthHeaders(cookies);
  const body = await request.json();
  const res = await fetch(`${SERVER_URL}/api/games/${params.gameId}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    Sentry.logger.error('Failed to update game', { status: res.status, gameId: params.gameId });
    error(res.status, 'Failed to update game');
  }
  return json(await res.json());
};

export const DELETE: RequestHandler = async ({ params, cookies }) => {
  const headers = getAuthHeaders(cookies);
  const res = await fetch(`${SERVER_URL}/api/games/${params.gameId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    Sentry.logger.error('Failed to delete game', { status: res.status, gameId: params.gameId });
    error(res.status, 'Failed to delete game');
  }
  return json({ success: true });
};
