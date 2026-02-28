import { apiGet } from '$lib/api';
import type { TwitchPaginatedResponse } from '@twitch-hub/shared-types';

export async function loadMorePaginated<T>(
  endpoint: string,
  current: TwitchPaginatedResponse<T>,
): Promise<TwitchPaginatedResponse<T>> {
  const cursor = current.pagination.cursor;
  if (!cursor) return current;

  const data = await apiGet<TwitchPaginatedResponse<T>>(
    `${endpoint}?after=${encodeURIComponent(cursor)}`,
  );

  return {
    total: data.total,
    data: [...current.data, ...data.data],
    pagination: data.pagination,
  };
}
