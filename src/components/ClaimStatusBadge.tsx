type ClaimStatus = "pending" | "investigating" | "verified" | "debunked" | "escalated";

interface ClaimStatusBadgeProps {
  status: ClaimStatus;
}

const statusConfig: Record<ClaimStatus, { label: string; className: string }> = {
  pending: { label: "PENDING", className: "status-badge status-pending" },
  investigating: { label: "INVESTIGATING", className: "status-badge status-investigating" },
  verified: { label: "VERIFIED", className: "status-badge status-verified" },
  debunked: { label: "DEBUNKED", className: "status-badge status-debunked" },
  escalated: { label: "ESCALATED", className: "status-badge status-escalated" },
};

export function ClaimStatusBadge({ status }: ClaimStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={config.className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />
      {config.label}
    </span>
  );
}
