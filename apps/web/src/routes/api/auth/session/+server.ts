import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ cookies }) => {
  const token = cookies.get('session');
  if (!token) {
    error(401, 'Not authenticated');
  }

  const serverUrl = env.PUBLIC_SERVER_URL || 'http://localhost:3001';
  const res = await fetch(`${serverUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    cookies.delete('session', { path: '/' });
    error(401, 'Invalid session');
  }

  const user = await res.json();
  return json(user);
};
