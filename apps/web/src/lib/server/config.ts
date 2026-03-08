import { env } from '$env/dynamic/private';
import { building } from '$app/environment';

// Prefer INTERNAL_SERVER_URL for server-to-server calls within Docker,
// falling back to PUBLIC_SERVER_URL (which may be an external domain).
export const SERVER_URL =
  env.INTERNAL_SERVER_URL || env.PUBLIC_SERVER_URL || 'http://localhost:3001';

// --- Validated env vars (fail fast instead of sending empty credentials) ---

const REQUIRED_VARS = [
  'TWITCH_CLIENT_ID',
  'TWITCH_CLIENT_SECRET',
  'TWITCH_REDIRECT_URI',
  'INTERNAL_API_SECRET',
] as const;

type RequiredVar = (typeof REQUIRED_VARS)[number];

function validateEnv(): Record<RequiredVar, string> {
  const result = {} as Record<RequiredVar, string>;

  const present: string[] = [];
  const missing: string[] = [];

  for (const key of REQUIRED_VARS) {
    const value = env[key];
    if (value) {
      result[key] = value;
      present.push(key);
    } else {
      missing.push(key);
    }
  }

  console.log(
    `[Config] ${present.map((k) => `${k}=set`).join(', ')}${missing.length ? `, ${missing.map((k) => `${k}=MISSING`).join(', ')}` : ''}`,
  );

  if (missing.length > 0 && !building) {
    const msg = `[Config] Missing required env vars: ${missing.join(', ')}`;
    console.error(msg);
    throw new Error(msg);
  }

  return result;
}

const validated = validateEnv();

export const TWITCH_CLIENT_ID = validated.TWITCH_CLIENT_ID;
export const TWITCH_CLIENT_SECRET = validated.TWITCH_CLIENT_SECRET;
export const TWITCH_REDIRECT_URI =
  validated.TWITCH_REDIRECT_URI || 'http://localhost:5173/api/auth/callback';
export const INTERNAL_API_SECRET = validated.INTERNAL_API_SECRET;
