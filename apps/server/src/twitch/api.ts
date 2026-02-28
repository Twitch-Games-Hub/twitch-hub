import { config } from '../config.js';

const HELIX_BASE = 'https://api.twitch.tv/helix';

interface TwitchTokens {
  accessToken: string;
  clientId: string;
}

function getHeaders(tokens: TwitchTokens) {
  return {
    Authorization: `Bearer ${tokens.accessToken}`,
    'Client-Id': tokens.clientId,
    'Content-Type': 'application/json',
  };
}

export async function getAppAccessToken(): Promise<string> {
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.twitch.clientId,
      client_secret: config.twitch.clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) throw new Error(`Failed to get app access token: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

export async function validateToken(accessToken: string): Promise<boolean> {
  const res = await fetch('https://id.twitch.tv/oauth2/validate', {
    headers: { Authorization: `OAuth ${accessToken}` },
  });
  return res.ok;
}

export async function refreshUserToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.twitch.clientId,
      client_secret: config.twitch.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error(`Failed to refresh token: ${res.status}`);
  return res.json();
}

export async function createEventSubSubscription(
  sessionId: string,
  type: string,
  version: string,
  condition: Record<string, string>,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${HELIX_BASE}/eventsub/subscriptions`, {
    method: 'POST',
    headers: getHeaders({ accessToken, clientId: config.twitch.clientId }),
    body: JSON.stringify({
      type,
      version,
      condition,
      transport: {
        method: 'websocket',
        session_id: sessionId,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create EventSub subscription: ${res.status} ${body}`);
  }
}

export async function getUserByLogin(login: string, accessToken: string) {
  const res = await fetch(`${HELIX_BASE}/users?login=${login}`, {
    headers: getHeaders({ accessToken, clientId: config.twitch.clientId }),
  });

  if (!res.ok) throw new Error(`Failed to get user: ${res.status}`);
  const data = await res.json();
  return data.data[0] || null;
}
