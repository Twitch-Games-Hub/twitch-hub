import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOptionalAuthHeaders } from '$lib/server/auth';
import { SERVER_URL } from '$lib/server/config';

export const GET: RequestHandler = async ({ params, cookies }) => {
  const headers = getOptionalAuthHeaders(cookies);
  const res = await fetch(`${SERVER_URL}/api/explore/${params.gameId}`, { headers });
  if (!res.ok) error(res.status, 'Failed to fetch game');
  return json(await res.json());
};
