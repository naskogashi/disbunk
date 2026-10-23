import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, expect, it, vi } from "vitest";
import en from "@/i18n/en.json";
import sq from "@/i18n/sq.json";
const workspace = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/App", () => { workspace.load(); return { default: () => <p>Workspace loaded</p> }; });
import RootApp from "@/RootApp";
import { ClaimStatusBadge } from "@/components/ClaimStatusBadge";
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });

it("defaults to Albanian on an English browser and loads the workspace only after navigation", async () => {
  localStorage.removeItem("disbunk_language");
  vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
  const { default: i18n } = await import("@/i18n");
  expect(i18n.language).toBe("sq");
  window.history.replaceState({}, "", "/");
  vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co"); vi.stubEnv("VITE_SUPABASE_ANON_KEY", "public-test-key");
  render(<I18nextProvider i18n={i18n}><RootApp/><ClaimStatusBadge status="investigating"/></I18nextProvider>);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(sq.identity.heroFirst);
  expect(screen.getByText(sq.claims.investigating)).toBeVisible();
  expect(workspace.load).not.toHaveBeenCalled();
  expect(screen.getAllByRole("link", { name: "English" })[0]).toHaveAttribute("href", "/en/");
  expect(screen.getAllByRole("link", { name: "Shqip" })[0]).toHaveAttribute("href", "/");
  expect(document.documentElement.lang).toBe("sq");
  fireEvent.click(screen.getByRole("link", { name: sq.landing.signIn }));
  expect(await screen.findByText("Workspace loaded")).toBeVisible();
  expect(workspace.load).toHaveBeenCalledTimes(1);
});

it("keeps Albanian dictionary coverage and translated account roles", () => {
  const flatten = (value: Record<string, unknown>, prefix = ""): string[] => Object.entries(value).flatMap(([key,item]) => typeof item === "object" && item ? flatten(item as Record<string,unknown>, `${prefix}${key}.`) : [`${prefix}${key}`]);
  expect(flatten(sq).sort()).toEqual(flatten(en).sort());
  expect(sq.roles.team_lead).toBe("Udhëheqës ekipi");
  expect(sq.accountStatus.pending_approval).not.toContain("pending");
});
