import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE_NAME } from '$lib/constants';

export const GET: RequestHandler = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE_NAME);
  if (!token) {
    error(401, 'Not authenticated');
  }

  return json({ token });
};
