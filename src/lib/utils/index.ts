export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const RELEASE_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatReleaseDate(date: Date | null): string {
  return date ? RELEASE_DATE_FORMAT.format(date) : "TBD";
}
