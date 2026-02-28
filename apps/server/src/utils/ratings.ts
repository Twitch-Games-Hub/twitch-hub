interface RatingRecord {
  value: number;
  userId: string;
}

export function computeRatings(
  ratings: RatingRecord[],
  userId: string | null,
): { ratingScore: number; ratingCount: number; userRating: number | null } {
  const ratingScore = ratings.reduce((sum, r) => sum + r.value, 0);
  const ratingCount = ratings.length;
  const userRating = userId ? (ratings.find((r) => r.userId === userId)?.value ?? null) : null;
  return { ratingScore, ratingCount, userRating };
}
