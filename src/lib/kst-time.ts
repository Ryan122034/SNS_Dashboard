const KST_TIME_ZONE = "Asia/Seoul";

const kstDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: KST_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

const kstWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: KST_TIME_ZONE,
  weekday: "short"
});

export function getKstDateString(date = new Date()) {
  const parts = kstDateFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

export function isSundayInKst(date = new Date()) {
  return kstWeekdayFormatter.format(date) === "Sun";
}

export { KST_TIME_ZONE };
