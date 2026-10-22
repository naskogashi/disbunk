import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ oauth: vi.fn(async () => ({ error: null })) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false, signInWithOAuth: mocks.oauth, signInWithMagicLink: vi.fn() }) }));
vi.mock("@/components/PublicHeader", () => ({ PublicHeader: () => null }));
vi.mock("@/components/ProjectFooter", () => ({ ProjectFooter: () => null }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
import Login from "@/pages/Login";
import { additionalSignInProviders } from "@/lib/oauth-providers";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); mocks.oauth.mockClear(); });
function settings(external: Record<string, boolean>) {
  vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co"); vi.stubEnv("VITE_SUPABASE_ANON_KEY", "public-test-key");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ external })));
}
it("offers configured Facebook and modern X and invokes the matching providers", async () => {
  settings({ facebook: true, x: true });
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={cache}><MemoryRouter><Login/></MemoryRouter></QueryClientProvider>);
  fireEvent.click(await screen.findByRole("button", { name: "Facebook" }));
  fireEvent.click(screen.getByRole("button", { name: "X", exact: true }));
  await waitFor(() => expect(mocks.oauth.mock.calls).toEqual([["facebook"], ["x"]]));
});
it("does not expose unconfigured providers or substitute deprecated Twitter", async () => {
  settings({ facebook: false, twitter: true });
  expect(await additionalSignInProviders()).toEqual({ facebook: false, x: false });
});
it("reports provider settings failures instead of assuming a provider is available", async () => {
  settings({}); vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 503 })));
  await expect(additionalSignInProviders()).rejects.toThrow("Unable to load sign-in providers");
});
