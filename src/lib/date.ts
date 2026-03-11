export function formatDate(dateInput: string): string {
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}
