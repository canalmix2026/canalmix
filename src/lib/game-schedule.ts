export const BRASILIA_TIME_ZONE = "America/Sao_Paulo";
export const GAME_SCHEDULE_RETENTION_MS = 3 * 60 * 60 * 1000;

export type GameCountry = {
  code: string;
  name: string;
};

export const GAME_COUNTRIES: GameCountry[] = [
  { code: "BR", name: "Brasil" },
  { code: "AR", name: "Argentina" },
  { code: "DE", name: "Alemanha" },
  { code: "ES", name: "Espanha" },
  { code: "FR", name: "França" },
  { code: "GB", name: "Inglaterra" },
  { code: "IT", name: "Itália" },
  { code: "LOCAL", name: "Mercado local" },
  { code: "PT", name: "Portugal" },
  { code: "US", name: "Estados Unidos" },
  { code: "OTHER", name: "Outro país" },
];

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function dateTimeParts(value: Date, timeZone = BRASILIA_TIME_ZONE): DateTimeParts {
  const values = new Map(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(value)
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(values.get("year")),
    month: Number(values.get("month")),
    day: Number(values.get("day")),
    hour: Number(values.get("hour")),
    minute: Number(values.get("minute")),
  };
}

function sameDateTime(left: DateTimeParts, right: DateTimeParts) {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  );
}

export function brasiliaDateTimeToUtc(date: string, time: string): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) {
    return null;
  }

  const local: DateTimeParts = {
    year: Number(dateMatch[1]),
    month: Number(dateMatch[2]),
    day: Number(dateMatch[3]),
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2]),
  };
  const localAsUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
  );
  const normalizedDate = new Date(localAsUtc);
  if (
    normalizedDate.getUTCFullYear() !== local.year ||
    normalizedDate.getUTCMonth() + 1 !== local.month ||
    normalizedDate.getUTCDate() !== local.day ||
    local.hour > 23 ||
    local.minute > 59
  ) {
    return null;
  }

  const offsetParts = dateTimeParts(new Date(localAsUtc));
  const representedAsUtc = Date.UTC(
    offsetParts.year,
    offsetParts.month - 1,
    offsetParts.day,
    offsetParts.hour,
    offsetParts.minute,
  );
  const instant = new Date(localAsUtc - (representedAsUtc - localAsUtc));
  if (!sameDateTime(dateTimeParts(instant), local)) {
    return null;
  }
  return instant.toISOString();
}

export function utcToBrasiliaInputs(value: string) {
  const parts = dateTimeParts(new Date(value));
  return {
    date: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
    time: `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`,
  };
}

export function formatBrasiliaDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRASILIA_TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatBrasiliaTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRASILIA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

export function brasiliaDateKey(value: string) {
  const values = new Map(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: BRASILIA_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

export function formatBrasiliaDateLong(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRASILIA_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function formatBrasiliaDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRASILIA_TIME_ZONE,
    dateStyle: "short",
  }).format(new Date(value));
}
