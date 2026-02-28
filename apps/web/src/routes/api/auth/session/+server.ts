import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE_NAME } from '$lib/constants';
import { SERVER_URL } from '$lib/server/config';

export const GET: RequestHandler = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE_NAME);
  if (!token) {
    error(401, 'Not authenticated');
  }

  const res = await fetch(`${SERVER_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
    error(401, 'Invalid session');
  }

  const user = await res.json();
  return json(user);
};
