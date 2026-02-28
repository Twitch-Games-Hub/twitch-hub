import { PostHog } from 'posthog-node';
import { config } from '../config.js';
import { logger } from '../logger.js';

const log = logger.child({ module: 'posthog' });

let client: PostHog | null = null;

function getPostHogClient(): PostHog | null {
  if (client) return client;
  if (!config.posthog.apiKey) {
    log.debug('PostHog API key not configured — analytics disabled');
    return null;
  }

  client = new PostHog(config.posthog.apiKey, { host: config.posthog.host });
  log.info('PostHog client initialized');
  return client;
}

export function trackEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>,
): void {
  getPostHogClient()?.capture({ distinctId: userId, event, properties });
}

export function identifyUser(userId: string, properties: Record<string, unknown>): void {
  getPostHogClient()?.identify({ distinctId: userId, properties });
}

export function trackEventWithGroups(
  userId: string,
  event: string,
  properties?: Record<string, unknown>,
  groups?: Record<string, string>,
): void {
  getPostHogClient()?.capture({ distinctId: userId, event, properties, groups });
}

export function setGroupProperties(
  groupType: string,
  groupKey: string,
  properties: Record<string, unknown>,
): void {
  getPostHogClient()?.groupIdentify({ groupType, groupKey, properties });
}

export async function shutdownPostHog(): Promise<void> {
  if (client) {
    await client.shutdown();
    log.info('PostHog client shut down');
    client = null;
  }
}
