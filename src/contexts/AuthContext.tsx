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
  });

  const fetchUserMeta = useCallback(async (userId: string) => {
    // Try RPC first (security definer, bypasses RLS)
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_my_profile_and_roles");

    if (!rpcError && rpcData) {
      const roles = (rpcData.roles as AppRole[]) ?? [];
      const profileStatus = (rpcData.status as ProfileStatus) ?? null;
      console.info("[Auth] Via RPC:", { userId, roles, profileStatus });
      return { roles, profileStatus };
    }

    // Fallback: direct queries
    console.warn("[Auth] RPC failed, falling back to direct queries:", rpcError?.message);
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("status").eq("user_id", userId).maybeSingle(),
    ]);

    const roles = (rolesRes.data?.map((r) => r.role) as AppRole[]) ?? [];
    const profileStatus = (profileRes.data?.status as ProfileStatus) ?? null;
    console.info("[Auth] Via fallback:", { userId, roles, profileStatus });
    return { roles, profileStatus };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const meta = await fetchUserMeta(state.user.id);
    setState((prev) => ({ ...prev, ...meta }));
  }, [state.user, fetchUserMeta]);

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user ?? null;

        if (user) {
          // Defer Supabase calls to avoid deadlock
          setTimeout(async () => {
            const meta = await fetchUserMeta(user.id);
            setState({ user, session, ...meta, loading: false });
          }, 0);
        } else {
          setState({ user: null, session: null, roles: [], profileStatus: null, loading: false });
        }
      }
    );

    // THEN check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;
      if (user) {
        const meta = await fetchUserMeta(user.id);
        setState({ user, session, ...meta, loading: false });
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserMeta]);

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
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
    setState({ user: null, session: null, roles: [], profileStatus: null, loading: false });
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
