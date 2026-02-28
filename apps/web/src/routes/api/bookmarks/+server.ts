import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthHeaders } from '$lib/server/auth';
import { SERVER_URL } from '$lib/server/config';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const headers = getAuthHeaders(cookies);
  const params = url.searchParams.toString();
  const res = await fetch(`${SERVER_URL}/api/bookmarks?${params}`, { headers });
  if (!res.ok) error(res.status, 'Failed to fetch bookmarks');
  return json(await res.json());
};
