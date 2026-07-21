export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function cleanStatus(status: string) {
  return status?.trim().toLowerCase();
}
