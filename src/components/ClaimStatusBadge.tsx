import { useTranslation } from "react-i18next";
type ClaimStatus = "pending" | "investigating" | "verified" | "debunked" | "escalated";

interface ClaimStatusBadgeProps {
  status: ClaimStatus;
}

const statusConfig: Record<ClaimStatus, { className: string }> = {
  pending: { className: "status-badge status-pending" },
  investigating: { className: "status-badge status-investigating" },
  verified: { className: "status-badge status-verified" },
  debunked: { className: "status-badge status-debunked" },
  escalated: { className: "status-badge status-escalated" },
};

export function ClaimStatusBadge({ status }: ClaimStatusBadgeProps) {
  const { t } = useTranslation();
  const config = statusConfig[status];
  return (
    <span className={config.className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />
      {t(`claims.${status}`)}
    </span>
  );
}
