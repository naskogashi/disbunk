import { afterAll, expect, it } from "vitest";
import i18n from "@/i18n";
import { displayDate, relativeTime } from "@/lib/locale";
afterAll(() => { void i18n.changeLanguage("sq"); });
it("formats relative activity and dates in the selected language", async () => {
  const now = Date.parse("2026-10-23T10:00:00Z");
  await i18n.changeLanguage("sq");
  expect(relativeTime("2026-10-23T09:30:00Z", now)).toMatch(/30.*minuta/);
  expect(relativeTime("2026-10-23T09:59:55Z", now)).toBe("sapo");
  expect(displayDate("2026-10-23T10:00:00Z")).toBe("23.10.2026");
  const albanian = displayDate("2026-10-23T10:00:00Z");
  await i18n.changeLanguage("en");
  expect(relativeTime("2026-10-23T09:30:00Z", now)).toBe("30 minutes ago");
  expect(displayDate("2026-10-23T10:00:00Z")).not.toBe(albanian);
  expect(displayDate("invalid")).toBe("—");
});
