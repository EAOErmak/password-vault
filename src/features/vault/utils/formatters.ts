export function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatOptionalName(value: string | null): string {
  return value?.trim() ? value : "Untitled account";
}

export function formatOptionalText(
  value: string | null,
  emptyFallback: string,
): string {
  return value?.trim() ? value : emptyFallback;
}
