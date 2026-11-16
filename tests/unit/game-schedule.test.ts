import assert from "node:assert/strict";
import test from "node:test";
import {
  BRASILIA_TIME_ZONE,
  brasiliaDateKey,
  brasiliaDateTimeToUtc,
  formatBrasiliaDateTime,
  formatBrasiliaDateLong,
  formatBrasiliaTime,
  utcToBrasiliaInputs,
} from "@/lib/game-schedule";

test("converts the schedule form from Brasília time to UTC", () => {
  assert.equal(BRASILIA_TIME_ZONE, "America/Sao_Paulo");
  assert.equal(
    brasiliaDateTimeToUtc("2026-11-16", "20:45"),
    "2026-11-16T23:45:00.000Z",
  );
});

test("round-trips stored UTC to the correct Brasília date and time", () => {
  const stored = "2026-11-17T02:15:00.000Z";
  assert.deepEqual(utcToBrasiliaInputs(stored), {
    date: "2026-11-16",
    time: "23:15",
  });
  assert.match(formatBrasiliaDateTime(stored), /16\/11\/2026, 23:15/);
  assert.equal(brasiliaDateKey(stored), "2026-11-16");
  assert.equal(formatBrasiliaTime(stored), "23:15");
  assert.match(formatBrasiliaDateLong(stored), /segunda-feira, 16 de novembro de 2026/);
  assert.equal(brasiliaDateKey("2026-11-17T03:00:00.000Z"), "2026-11-17");
});

test("rejects invalid or normalized date and time inputs", () => {
  assert.equal(brasiliaDateTimeToUtc("2026-02-30", "20:00"), null);
  assert.equal(brasiliaDateTimeToUtc("2026-11-16", "24:00"), null);
  assert.equal(brasiliaDateTimeToUtc("16/11/2026", "20:00"), null);
  assert.equal(brasiliaDateTimeToUtc("2026-11-16", "8:00"), null);
});
