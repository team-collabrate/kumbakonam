import type { TopItem } from "../utils/dashboardStats";
import "./TopItemsList.css";

export interface TopItemsListProps {
  items: TopItem[];
}

export function TopItemsList({ items }: TopItemsListProps) {
  if (items.length === 0) {
    return <p className="top-items__empty">No sales yet in this period.</p>;
  }

  return (
    <ol className="top-items">
      {items.map((item, index) => (
        <li key={item.name} className="top-items__row">
          <span className="top-items__rank">{index + 1}</span>
          <span className="top-items__name">{item.name}</span>
          <span className="top-items__qty">{item.qty} sold</span>
        </li>
      ))}
    </ol>
  );
}
