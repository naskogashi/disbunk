import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/types/database";
import { PendingApproval } from "@/pages/PendingApproval";
import { Loader2 } from "lucide-react";
import { ModuleError } from "@/components/ModuleError";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
  requireApproval?: boolean;
}

export function ProtectedRoute({ children, requiredRoles, requireApproval = true }: ProtectedRouteProps) {
  const { user, loading, isApproved, hasAnyRole, profileStatus, authError, refreshProfile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (authError) return <div className="mx-auto max-w-xl p-8"><ModuleError error={new Error(authError)} retry={refreshProfile} /></div>;

  if (requireApproval && !isApproved) {
    return <PendingApproval status={profileStatus} />;
  }

  if (requiredRoles && !hasAnyRole(requiredRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
