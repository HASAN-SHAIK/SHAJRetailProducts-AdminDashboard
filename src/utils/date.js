export const formatDateTimeIST = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);

  const map = {};
  parts.forEach((part) => {
    map[part.type] = part.value;
  });

  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}`;
};
