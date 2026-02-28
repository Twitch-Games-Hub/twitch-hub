export function parsePagination(
  query: { page?: string; limit?: string },
  defaults = { limit: 20, maxLimit: 50 },
) {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(
    defaults.maxLimit,
    Math.max(1, parseInt(query.limit as string) || defaults.limit),
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
