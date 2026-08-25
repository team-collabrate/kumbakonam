import "./SyncStatusBadge.css";

export type SyncStatus = "online" | "offline" | "pending";

const CONTENT: Record<SyncStatus, { icon: string; label: string }> = {
  online: { icon: "●", label: "Online" },
  offline: { icon: "⚠", label: "Offline — will sync" },
  pending: { icon: "↻", label: "Syncing…" },
};

export interface SyncStatusBadgeProps {
  status: SyncStatus;
}

/** Design Brief §8 — never rely on color alone, always pair with icon + text. */
export function SyncStatusBadge({ status }: SyncStatusBadgeProps) {
  const { icon, label } = CONTENT[status];
  return (
    <span className={`sync-badge sync-badge--${status}`} role="status">
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
