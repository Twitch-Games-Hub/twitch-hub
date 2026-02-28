import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@twitch-hub/shared-types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

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

export function getPlaySocket(): TypedSocket {
  if (!playSocket) {
    playSocket = io(`${SERVER_URL}/play`, {
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

export function disconnectAll() {
  dashboardSocket?.disconnect();
  playSocket?.disconnect();
  overlaySocket?.disconnect();
  dashboardSocket = null;
  playSocket = null;
  overlaySocket = null;
}
