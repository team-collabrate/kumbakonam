import "./StatCard.css";

export interface StatCardProps {
  label: string;
  value: string;
}

/** Design Brief §6/§7 — top summary cards, readable "at a glance". */
export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="stat-card">
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value}</p>
    </div>
  );
}
