import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthHeaders } from '$lib/server/auth';
import { SERVER_URL } from '$lib/server/config';
import * as Sentry from '@sentry/sveltekit';

export const GET: RequestHandler = async ({ cookies }) => {
  const headers = getAuthHeaders(cookies);
  const res = await fetch(`${SERVER_URL}/api/billing/subscription`, { headers });
  if (!res.ok) {
    Sentry.logger.error('Failed to fetch subscription', { status: res.status });
    error(res.status, 'Failed to fetch subscription');
  }
  return json(await res.json());
};
