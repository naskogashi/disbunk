import i18n from "@/i18n";
export function uiLocale() { return i18n.language?.startsWith("en") ? "en-GB" : "sq-AL"; }
export function displayDate(value: string | Date) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(uiLocale(), { year: "numeric", month: "short", day: "numeric" }) : "—";
}
export function displayDateTime(value: string | Date) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString(uiLocale(), { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}
export function relativeTime(value: string, now = Date.now()) {
  const date = new Date(value), seconds = (date.getTime() - now) / 1000;
  if (!Number.isFinite(seconds)) return "—";
  if (Math.abs(seconds) < 60) return i18n.t("common.justNow");
  const format = new Intl.RelativeTimeFormat(uiLocale(), { numeric: "auto" });
  if (Math.abs(seconds) < 3600) return format.format(Math.trunc(seconds / 60), "minute");
  if (Math.abs(seconds) < 86400) return format.format(Math.trunc(seconds / 3600), "hour");
  if (Math.abs(seconds) < 604800) return format.format(Math.trunc(seconds / 86400), "day");
  return displayDate(date);
}
