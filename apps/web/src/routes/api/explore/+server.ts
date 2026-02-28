import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOptionalAuthHeaders } from '$lib/server/auth';
import { SERVER_URL } from '$lib/server/config';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const headers = getOptionalAuthHeaders(cookies);
  const search = url.searchParams.toString();

  let res: Response;
  try {
    res = await fetch(`${SERVER_URL}/api/explore${search ? `?${search}` : ''}`, { headers });
  } catch {
    error(502, 'Backend server is unreachable');
  }

  if (!res.ok) error(res.status, 'Failed to fetch explore games');
  return json(await res.json());
};
