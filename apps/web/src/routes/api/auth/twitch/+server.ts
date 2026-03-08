import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import { TWITCH_CLIENT_ID, TWITCH_REDIRECT_URI } from '$lib/server/config';

export const GET: RequestHandler = async ({ cookies }) => {
  const state = crypto.randomUUID();
  cookies.set('oauth_state', state, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: !dev,
    maxAge: 600,
  });

  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    redirect_uri: TWITCH_REDIRECT_URI,
    response_type: 'code',
    scope:
      'openid user:read:chat user:write:chat user:read:follows moderator:read:followers user:read:subscriptions moderation:read',
    state,
  });

  redirect(302, `https://id.twitch.tv/oauth2/authorize?${params}`);
};
