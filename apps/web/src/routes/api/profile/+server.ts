import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthHeaders } from '$lib/server/auth';
import { SERVER_URL } from '$lib/server/config';

export const GET: RequestHandler = async ({ cookies }) => {
  const headers = getAuthHeaders(cookies);
  let res: Response;
  try {
    res = await fetch(`${SERVER_URL}/api/profile`, { headers });
  } catch {
    error(502, 'Backend server is unreachable');
  }
  if (!res.ok) error(res.status, 'Failed to fetch profile');
  return json(await res.json());
};
