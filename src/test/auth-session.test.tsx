import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const api = vi.hoisted(() => ({ getSession: vi.fn(), onAuthStateChange: vi.fn(), rpc: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { auth: api, rpc: api.rpc } }));
let listener: (event: string, session: Session | null) => void;
const session = { user: { id: "user-one", email: "user@example.org" }, access_token: "test" } as Session;
function Probe() {
  const auth = useAuth();
  return <div><span>{auth.loading ? "loading" : auth.user?.id ?? "signed-out"}</span><span>{auth.authError}</span><span>{auth.profileStatus}</span><button onClick={auth.refreshProfile}>Refresh profile</button></div>;
}
beforeEach(() => {
  vi.clearAllMocks();
  api.getSession.mockResolvedValue({ data: { session: null }, error: null });
  api.onAuthStateChange.mockImplementation(callback => { listener = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; });
});
afterEach(cleanup);
describe("Authentication registration recovery", () => {
  it("does not restore a stale signed-in session after sign out", async () => {
    let resolveMeta: (value: unknown) => void;
    api.rpc.mockImplementation(() => new Promise(resolve => { resolveMeta = resolve; }));
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText("signed-out");
    act(() => { expect(listener("SIGNED_IN", session)).toBeUndefined(); });
    await waitFor(() => expect(api.rpc).toHaveBeenCalled());
    act(() => listener("SIGNED_OUT", null));
    await act(async () => { resolveMeta!({ data: { roles: ["admin"], status: "approved" }, error: null }); });
    expect(screen.getByText("signed-out")).toBeInTheDocument();
    expect(screen.queryByText("approved")).not.toBeInTheDocument();
  });
  it("surfaces account loading errors and recovers after a retry", async () => {
    api.rpc.mockRejectedValueOnce(new Error("Profile service unavailable"));
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText("signed-out");
    act(() => listener("SIGNED_IN", session));
    expect(await screen.findByText("Profile service unavailable")).toBeInTheDocument();
    api.rpc.mockResolvedValue({ data: { roles: ["analyst"], status: "approved" }, error: null });
    await act(async () => screen.getByText("Refresh profile").click());
    expect(await screen.findByText("approved")).toBeInTheDocument();
    expect(screen.queryByText("Profile service unavailable")).not.toBeInTheDocument();
  });
});
