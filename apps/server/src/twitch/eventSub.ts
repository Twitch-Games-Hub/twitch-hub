import * as Sentry from '@sentry/node';
import WebSocket from 'ws';
import { parseChatCommand } from './chatParser.js';
import { createEventSubSubscription } from './api.js';
import { voteService } from '../services/VoteService.js';
import { ResponseSource } from '@twitch-hub/shared-types';
import { logger } from '../logger.js';

const log = logger.child({ module: 'eventsub' });

interface EventSubMessage {
  metadata: {
    message_id: string;
    message_type: string;
    message_timestamp: string;
    subscription_type?: string;
  };
  payload: {
    session?: {
      id: string;
      keepalive_timeout_seconds: number;
      reconnect_url?: string;
    };
    event?: {
      broadcaster_user_id: string;
      chatter_user_login: string;
      message: {
        text: string;
      };
    };
  };
}

export class EventSubClient {
  private ws: WebSocket | null = null;
  private twitchSessionId: string | null = null;
  private keepaliveTimer?: ReturnType<typeof setTimeout>;
  private keepaliveTimeoutMs = 15000;

  // Maps channelId to active game sessionId
  private channelToSession = new Map<string, string>();

  constructor(
    private accessToken: string,
    private userId: string,
  ) {}

  connect() {
    this.ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws');

    this.ws.on('open', () => {
      log.info('EventSub WebSocket connected');
    });

    this.ws.on('message', (data) => {
      const message: EventSubMessage = JSON.parse(data.toString());
      this.handleMessage(message);
    });

    this.ws.on('close', (code, reason) => {
      log.warn({ code, reason: reason.toString() }, 'EventSub WebSocket closed');
      this.clearKeepalive();
      // Reconnect after a delay
      setTimeout(() => this.connect(), 5000);
    });

    this.ws.on('error', (err) => {
      log.error({ err }, 'EventSub WebSocket error');
      Sentry.captureException(err, { tags: { module: 'eventsub' } });
    });
  }

  private handleMessage(message: EventSubMessage) {
    switch (message.metadata.message_type) {
      case 'session_welcome':
        this.onWelcome(message);
        break;
      case 'session_keepalive':
        this.resetKeepalive();
        break;
      case 'notification':
        this.onNotification(message);
        break;
      case 'session_reconnect':
        this.onReconnect(message);
        break;
    }
  }

  private async onWelcome(message: EventSubMessage) {
    this.twitchSessionId = message.payload.session!.id;
    this.keepaliveTimeoutMs = (message.payload.session!.keepalive_timeout_seconds + 5) * 1000;
    this.resetKeepalive();

    log.info({ twitchSessionId: this.twitchSessionId }, 'EventSub session established');
  }

  async subscribeToChat(broadcasterId: string) {
    if (!this.twitchSessionId) {
      throw new Error('EventSub session not established');
    }

    await createEventSubSubscription(
      this.twitchSessionId,
      'channel.chat.message',
      '1',
      {
        broadcaster_user_id: broadcasterId,
        user_id: this.userId,
      },
      this.accessToken,
    );

    log.info({ broadcasterId }, 'Subscribed to chat');
  }

  registerSession(channelId: string, gameSessionId: string) {
    this.channelToSession.set(channelId, gameSessionId);
  }

  unregisterSession(channelId: string) {
    this.channelToSession.delete(channelId);
  }

  private async onNotification(message: EventSubMessage) {
    if (message.metadata.subscription_type === 'channel.chat.message') {
      const event = message.payload.event!;
      const command = parseChatCommand(event.message.text);
      if (!command) return;

      const sessionId = this.channelToSession.get(event.broadcaster_user_id);
      if (!sessionId) return;

      try {
        let answer: unknown;
        switch (command.type) {
          case 'rate':
            answer = command.value;
            break;
          case 'vote':
            answer = command.value;
            break;
          case 'answer':
            answer = command.value;
            break;
          case 'pick':
            answer = command.value;
            break;
        }

        await voteService.submitVote({
          sessionId,
          twitchLogin: event.chatter_user_login,
          answer,
          source: ResponseSource.CHAT,
        });
      } catch (err) {
        log.error(
          { err, chatter: event.chatter_user_login, sessionId },
          'Error processing chat command',
        );
        Sentry.captureException(err, {
          tags: { module: 'eventsub', handler: 'notification' },
          extra: { chatter: event.chatter_user_login, sessionId },
        });
      }
    }
  }

  private onReconnect(message: EventSubMessage) {
    const reconnectUrl = message.payload.session?.reconnect_url;
    if (reconnectUrl) {
      log.info({ reconnectUrl }, 'EventSub reconnecting');
      const oldWs = this.ws;
      this.ws = new WebSocket(reconnectUrl);

      this.ws.on('open', () => {
        log.info('EventSub reconnected');
        oldWs?.close();
      });

      this.ws.on('message', (data) => {
        const msg: EventSubMessage = JSON.parse(data.toString());
        this.handleMessage(msg);
      });
    }
  }

  private resetKeepalive() {
    this.clearKeepalive();
    this.keepaliveTimer = setTimeout(() => {
      log.warn('EventSub keepalive timeout, reconnecting');
      this.ws?.close();
    }, this.keepaliveTimeoutMs);
  }

  private clearKeepalive() {
    if (this.keepaliveTimer) {
      clearTimeout(this.keepaliveTimer);
    }
  }

  disconnect() {
    this.clearKeepalive();
    this.ws?.close();
    this.ws = null;
  }
}
