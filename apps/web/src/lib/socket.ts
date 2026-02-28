import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@twitch-hub/shared-types';
import { env } from '$env/dynamic/public';
import { getAnonId } from '$lib/utils/anonId';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = env.PUBLIC_SERVER_URL || 'http://localhost:3001';

let dashboardSocket: TypedSocket | null = null;
let playSocket: TypedSocket | null = null;
let overlaySocket: TypedSocket | null = null;

export function getDashboardSocket(token: string): TypedSocket {
  if (!dashboardSocket) {
    dashboardSocket = io(`${SERVER_URL}/dashboard`, {
      auth: { token },
      transports: ['websocket'],
    });
  }
  return dashboardSocket;
}

export function getPlaySocket(token?: string): TypedSocket {
  if (!playSocket) {
    playSocket = io(`${SERVER_URL}/play`, {
      auth: token ? { token } : { anonId: getAnonId() },
      transports: ['websocket'],
    });
  }
  return playSocket;
}

export function getOverlaySocket(): TypedSocket {
  if (!overlaySocket) {
    overlaySocket = io(`${SERVER_URL}/overlay`, {
      transports: ['websocket'],
    });
  }
  return overlaySocket;
}

export function disconnectDashboard() {
  dashboardSocket?.disconnect();
  dashboardSocket = null;
}

export function disconnectPlay() {
  playSocket?.disconnect();
  playSocket = null;
}

export function disconnectOverlay() {
  overlaySocket?.disconnect();
  overlaySocket = null;
}

export function disconnectAll() {
  disconnectDashboard();
  disconnectPlay();
  disconnectOverlay();
}
