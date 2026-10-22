import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import type { AppRole, ProfileStatus } from "@/types/database";

interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  profileStatus: ProfileStatus | null;
  loading: boolean;
  authError: string | null;
}

interface AuthContextType extends AuthState {
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signInWithOAuth: (provider: "google" | "github") => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  isApproved: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    roles: [],
    profileStatus: null,
    loading: true,
    authError: null,
  });

  const fetchUserMeta = useCallback(async (userId: string) => {
    // Try RPC first (security definer, bypasses RLS)
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_my_profile_and_roles");

    if (!rpcError && rpcData) {
      const roles = (rpcData.roles as AppRole[]) ?? [];
      const profileStatus = (rpcData.status as ProfileStatus) ?? null;
      return { roles, profileStatus };
    }

    // Fallback: direct queries
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("status").eq("user_id", userId).maybeSingle(),
    ]);

    const roles = (rolesRes.data?.map((r) => r.role) as AppRole[]) ?? [];
    if (rolesRes.error || profileRes.error) throw new Error(rolesRes.error?.message || profileRes.error?.message);
    const profileStatus = (profileRes.data?.status as ProfileStatus) ?? null;
    return { roles, profileStatus };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const userId = state.user.id;
    try {
      const meta = await fetchUserMeta(userId);
      setState(previous => previous.user?.id === userId ? { ...previous, ...meta, authError: null } : previous);
    } catch (error) { setState(previous => ({ ...previous, authError: error instanceof Error ? error.message : "Unable to load account" })); }
  }, [state.user, fetchUserMeta]);

  useEffect(() => {
    let active = true;
    let revision = 0;
    let timer: ReturnType<typeof setTimeout>;
    const applySession = (session: Session | null) => {
      const currentRevision = ++revision;
      clearTimeout(timer);
      const user = session?.user ?? null;
      if (!user) {
        setState({ user: null, session: null, roles: [], profileStatus: null, loading: false, authError: null });
        return;
      }
      setState(previous => ({ user, session, roles: previous.user?.id === user.id ? previous.roles : [], profileStatus: previous.user?.id === user.id ? previous.profileStatus : null, loading: true, authError: null }));
      // The auth callback returns synchronously before any other auth-backed
      // query starts, avoiding the Supabase auth lock. Ignore stale responses.
      timer = setTimeout(async () => {
        try {
          const meta = await fetchUserMeta(user.id);
          if (active && revision === currentRevision) setState({ user, session, ...meta, loading: false, authError: null });
        } catch (error) {
          if (active && revision === currentRevision) setState({ user, session, roles: [], profileStatus: null, loading: false, authError: error instanceof Error ? error.message : "Unable to load account" });
        }
      }, 0);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => applySession(session)
    );

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!active || revision !== 0) return;
      if (error) setState(previous => ({ ...previous, loading: false, authError: error.message }));
      else applySession(session);
    }).catch(error => { if (active && revision === 0) setState(previous => ({ ...previous, loading: false, authError: String(error) })); });

    return () => { active = false; revision++; clearTimeout(timer); subscription.unsubscribe(); };
  }, [fetchUserMeta]);

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin + "/dashboard" },
    });
    return { error: error as Error | null };
  };

  const signInWithOAuth = async (provider: "google" | "github") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + "/dashboard" },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ user: null, session: null, roles: [], profileStatus: null, loading: false, authError: null });
  };

  const hasRole = (role: AppRole) => state.roles.includes(role);
  const hasAnyRole = (roles: AppRole[]) => roles.some((r) => state.roles.includes(r));
  const isApproved = state.profileStatus === "approved";

  return (
    <AuthContext.Provider
      value={{ ...state, signInWithMagicLink, signInWithOAuth, signOut, hasRole, hasAnyRole, isApproved, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
