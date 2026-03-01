import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthHeaders } from '$lib/server/auth';
import { SERVER_URL } from '$lib/server/config';
import * as Sentry from '@sentry/sveltekit';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const headers = getAuthHeaders(cookies);
  const search = url.searchParams.toString();

  let res: Response;
  try {
    res = await fetch(`${SERVER_URL}/api/sessions${search ? `?${search}` : ''}`, { headers });
  } catch {
    Sentry.logger.error('Backend server unreachable', { endpoint: '/api/sessions' });
    error(502, 'Backend server is unreachable');
  }

  if (!res.ok) {
    Sentry.logger.error('Failed to fetch sessions', { status: res.status });
    error(res.status, 'Failed to fetch sessions');
  }
  return json(await res.json());
};
