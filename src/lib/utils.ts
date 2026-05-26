export function leadScore(input: {
  hasPhone?: boolean;
  hasWebsite?: boolean;
  reviewCount?: number | null;
  rating?: number | null;
}) {
  let score = 50;

  if (input.hasPhone) score += 10;
  if (!input.hasWebsite) score += 20;
  if ((input.reviewCount ?? 0) < 20) score += 10;
  if ((input.rating ?? 5) < 4.2) score += 10;

  return Math.min(score, 100);
}