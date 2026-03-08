import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import * as Sentry from '@sentry/sveltekit';
import {
  SERVER_URL,
  TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET,
  TWITCH_REDIRECT_URI,
  INTERNAL_API_SECRET,
} from '$lib/server/config';

async function safeFetch(url: string, init: RequestInit, label: string): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    const cause = err instanceof Error ? (err.cause ?? err.message) : err;
    Sentry.logger.error(`${label} fetch failed (network)`, {
      url,
      cause: String(cause),
    });
    console.error(`[OAuth] ${label} fetch failed:`, cause);
    error(502, `${label}: service unreachable`);
  }
}

export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = cookies.get('oauth_state');

  if (!code || !state || state !== storedState) {
    Sentry.logger.warn('OAuth state validation failed', {
      hasCode: !!code,
      hasState: !!state,
      stateMatch: state === storedState,
    });
    error(400, 'Invalid OAuth state');
  }

  cookies.delete('oauth_state', { path: '/' });

  // Exchange code for tokens
  const tokenRes = await safeFetch(
    'https://id.twitch.tv/oauth2/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: TWITCH_REDIRECT_URI,
      }),
    },
    'Twitch token exchange',
  );

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    Sentry.logger.error('Twitch token exchange failed', { status: tokenRes.status, body });
    console.error('[OAuth] Twitch token exchange failed:', tokenRes.status, body);
    error(500, 'Failed to exchange token with Twitch');
  }

  const tokens = await tokenRes.json();

  // Get user info from Twitch
  const userRes = await safeFetch(
    'https://api.twitch.tv/helix/users',
    {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Client-Id': TWITCH_CLIENT_ID,
      },
    },
    'Twitch user fetch',
  );

  if (!userRes.ok) {
    Sentry.logger.error('Twitch user fetch failed', { status: userRes.status });
    error(500, 'Failed to fetch Twitch user');
  }

  const {
    data: [twitchUser],
  } = await userRes.json();

  // Upsert user via real-time server API (prefer internal Docker URL)
  const upsertRes = await safeFetch(
    `${SERVER_URL}/api/auth/upsert`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_API_SECRET,
      },
      body: JSON.stringify({
        twitchId: twitchUser.id,
        twitchLogin: twitchUser.login,
        displayName: twitchUser.display_name,
        profileImageUrl: twitchUser.profile_image_url,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      }),
    },
    'User upsert',
  );

  if (!upsertRes.ok) {
    Sentry.logger.error('User upsert failed', {
      status: upsertRes.status,
      twitchLogin: twitchUser.login,
    });
    error(500, 'Failed to save user');
  }

  const { token } = await upsertRes.json();

  cookies.set('session', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: !dev,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  Sentry.logger.info('User authenticated via OAuth', { twitchLogin: twitchUser.login });

  redirect(302, '/dashboard');
};
