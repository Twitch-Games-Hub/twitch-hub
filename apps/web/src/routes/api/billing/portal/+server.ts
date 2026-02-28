import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthHeaders } from '$lib/server/auth';
import { SERVER_URL } from '$lib/server/config';

export const POST: RequestHandler = async ({ cookies }) => {
  const headers = getAuthHeaders(cookies);
  const res = await fetch(`${SERVER_URL}/api/billing/portal`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) error(res.status, 'Failed to create portal session');
  return json(await res.json());
};
