type ClaimStatus = "pending" | "investigating" | "verified" | "debunked" | "escalated";

interface ClaimStatusBadgeProps {
  status: ClaimStatus;
}

const statusConfig: Record<ClaimStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "status-badge status-pending" },
  investigating: { label: "Investigating", className: "status-badge status-investigating" },
  verified: { label: "Verified", className: "status-badge status-verified" },
  debunked: { label: "Debunked", className: "status-badge status-debunked" },
  escalated: { label: "Escalated", className: "status-badge status-escalated" },
};

export function ClaimStatusBadge({ status }: ClaimStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={config.className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />
      {config.label}
    </span>
  );
}
