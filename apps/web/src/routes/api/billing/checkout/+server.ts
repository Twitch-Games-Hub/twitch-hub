import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthHeaders } from '$lib/server/auth';
import { SERVER_URL } from '$lib/server/config';
import * as Sentry from '@sentry/sveltekit';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const headers = getAuthHeaders(cookies);
  const body = await request.json();
  const res = await fetch(`${SERVER_URL}/api/billing/checkout`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    Sentry.logger.error('Checkout session creation failed', {
      status: res.status,
      reason: body.error,
    });
    error(res.status, body.error || 'Failed to create checkout session');
  }
  return json(await res.json());
};
