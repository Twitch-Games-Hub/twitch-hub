import { env } from '$env/dynamic/private';

export const SERVER_URL = env.PUBLIC_SERVER_URL || 'http://localhost:3001';
