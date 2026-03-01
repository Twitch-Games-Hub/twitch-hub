import { error } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { SESSION_COOKIE_NAME } from '$lib/constants';

export function getAuthHeaders(cookies: Cookies): { Authorization: string } {
  const token = cookies.get(SESSION_COOKIE_NAME);
  if (!token) throw error(401, 'Not authenticated');
  return { Authorization: `Bearer ${token}` };
}

export function getOptionalAuthHeaders(cookies: Cookies): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = cookies.get(SESSION_COOKIE_NAME);
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}
