import { useLanguage } from "../../i18n";
import "./SyncStatusBadge.css";

export type SyncStatus = "online" | "offline" | "pending";

const CONTENT: Record<SyncStatus, { icon: string; label: { en: string; ta: string } }> = {
  online: { icon: "●", label: { en: "Online", ta: "ஆன்லைன்" } },
  offline: { icon: "⚠", label: { en: "Offline — will sync", ta: "ஆஃப்லைன் — பின்னர் ஒத்திசைக்கும்" } },
  pending: { icon: "↻", label: { en: "Syncing…", ta: "ஒத்திசைக்கிறது…" } },
};

export interface SyncStatusBadgeProps {
  status: SyncStatus;
}

/** Design Brief §8 — never rely on color alone, always pair with icon + text. */
export function SyncStatusBadge({ status }: SyncStatusBadgeProps) {
  const { language } = useLanguage();
  const { icon, label } = CONTENT[status];
  return (
    <span className={`sync-badge sync-badge--${status}`} role="status">
      <span aria-hidden="true">{icon}</span>
      {label[language]}
    </span>
  );
}
