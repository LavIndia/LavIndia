const NEW_ARRIVAL_WINDOW_DAYS = 30;

// Shared with every place that lists products (category pages, search,
// single product page) so "New Arrival" / "Bestseller" always mean the same
// thing everywhere — computed from real data (creation date, actual sales),
// never an admin guess.
export function isNewArrival(createdAt: Date) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - NEW_ARRIVAL_WINDOW_DAYS);
  return createdAt >= cutoff;
}

export function isBestSeller(orderItemCount: number) {
  return orderItemCount > 0;
}
