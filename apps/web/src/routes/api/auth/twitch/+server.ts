import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ cookies }) => {
  const state = crypto.randomUUID();
  cookies.set('oauth_state', state, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 600,
  });

  const params = new URLSearchParams({
    client_id: env.TWITCH_CLIENT_ID || '',
    redirect_uri: env.TWITCH_REDIRECT_URI || 'http://localhost:5173/api/auth/callback',
    response_type: 'code',
    scope: 'openid user:read:chat user:write:chat',
    state,
  });

  redirect(302, `https://id.twitch.tv/oauth2/authorize?${params}`);
};
