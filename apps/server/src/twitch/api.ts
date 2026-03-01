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

export async function getUserById(userId: string, accessToken: string) {
  const res = await fetch(`${HELIX_BASE}/users?id=${userId}`, {
    headers: getHeaders({ accessToken, clientId: config.twitch.clientId }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data[0] || null;
}

export async function getChannel(broadcasterId: string, accessToken: string) {
  const res = await fetch(`${HELIX_BASE}/channels?broadcaster_id=${broadcasterId}`, {
    headers: getHeaders({ accessToken, clientId: config.twitch.clientId }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data[0] || null;
}

export async function getStream(userId: string, accessToken: string) {
  const res = await fetch(`${HELIX_BASE}/streams?user_id=${userId}`, {
    headers: getHeaders({ accessToken, clientId: config.twitch.clientId }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data[0] || null;
}

export async function getFollowedChannels(
  userId: string,
  accessToken: string,
  first = 20,
  after?: string,
) {
  const params = new URLSearchParams({ user_id: userId, first: String(first) });
  if (after) params.set('after', after);
  const res = await fetch(`${HELIX_BASE}/channels/followed?${params}`, {
    headers: getHeaders({ accessToken, clientId: config.twitch.clientId }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getFollowedStreams(userId: string, accessToken: string, first = 20) {
  const params = new URLSearchParams({ user_id: userId, first: String(first) });
  const res = await fetch(`${HELIX_BASE}/streams/followed?${params}`, {
    headers: getHeaders({ accessToken, clientId: config.twitch.clientId }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getVideos(userId: string, accessToken: string, type = 'archive', first = 3) {
  const params = new URLSearchParams({
    user_id: userId,
    type,
    first: String(first),
  });
  const res = await fetch(`${HELIX_BASE}/videos?${params}`, {
    headers: getHeaders({ accessToken, clientId: config.twitch.clientId }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data ?? null;
}

export async function getFollowers(
  broadcasterId: string,
  accessToken: string,
  first = 20,
  after?: string,
) {
  const params = new URLSearchParams({ broadcaster_id: broadcasterId, first: String(first) });
  if (after) params.set('after', after);
  const res = await fetch(`${HELIX_BASE}/channels/followers?${params}`, {
    headers: getHeaders({ accessToken, clientId: config.twitch.clientId }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getModerators(
  broadcasterId: string,
  accessToken: string,
  first = 100,
  after?: string,
) {
  const params = new URLSearchParams({ broadcaster_id: broadcasterId, first: String(first) });
  if (after) params.set('after', after);
  const res = await fetch(`${HELIX_BASE}/moderation/moderators?${params}`, {
    headers: getHeaders({ accessToken, clientId: config.twitch.clientId }),
  });
  if (!res.ok) return null;
  return res.json();
}
