import "./BottomTabBar.css";

export type TabKey = "dashboard" | "reports" | "menu" | "settings";

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: "dashboard", label: "Dashboard", icon: "⌂" },
  { key: "reports", label: "Reports", icon: "▤" },
  { key: "menu", label: "Menu", icon: "☰" },
  { key: "settings", label: "Settings", icon: "⚙" },
];

export interface BottomTabBarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

/** Design Brief §6 — bottom tab bar: Dashboard / Reports / Menu / Settings. */
export function BottomTabBar({ active, onChange }: BottomTabBarProps) {
  return (
    <nav className="bottom-tabs" aria-label="Main navigation">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`bottom-tabs__item ${active === tab.key ? "is-active" : ""}`}
          onClick={() => onChange(tab.key)}
          aria-current={active === tab.key ? "page" : undefined}
        >
          <span className="bottom-tabs__icon" aria-hidden="true">
            {tab.icon}
          </span>
          <span className="bottom-tabs__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
