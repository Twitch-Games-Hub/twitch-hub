import { env } from '$env/dynamic/private';

// Prefer INTERNAL_SERVER_URL for server-to-server calls within Docker,
// falling back to PUBLIC_SERVER_URL (which may be an external domain).
export const SERVER_URL =
  env.INTERNAL_SERVER_URL || env.PUBLIC_SERVER_URL || 'http://localhost:3001';
