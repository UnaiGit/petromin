import type { ComponentType } from "react";

export interface BottomNavItem {
  id: string;
  label: string;
  icon: ComponentType<{ active?: boolean }>;
}

interface BottomNavProps {
  items?: BottomNavItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
}

const defaultItems: BottomNavItem[] = [
  { id: "home", label: "Home", icon: MapIcon },
  { id: "search", label: "Search", icon: SearchIcon },
  { id: "rides", label: "Rides", icon: CarIcon },
  { id: "favorites", label: "Favorites", icon: HeartIcon },
  { id: "profile", label: "Profile", icon: UserIcon },
];

export function BottomNav({ items = defaultItems, activeId = "home", onSelect }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map((tab) => {
        const active = tab.id === activeId;
        const Icon = tab.icon;
        return (
          <button
            type="button"
            key={tab.id}
            className={`bottom-nav__item${active ? " is-active" : ""}`}
            onClick={() => onSelect?.(tab.id)}
            aria-current={active ? "page" : undefined}
            disabled={!active && !onSelect}
          >
            <Icon active={active} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export const corporateNavItems: BottomNavItem[] = [
  { id: "home", label: "Home", icon: MapIcon },
  { id: "catalog", label: "Catalog", icon: CatalogIcon },
  { id: "orders", label: "Orders", icon: OrdersIcon },
  { id: "company", label: "Company", icon: BuildingIcon },
  { id: "help", label: "Help", icon: HelpIcon },
];

function MapIcon({ active }: { active?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 4.5L3.5 6.4v13.1l5.5-1.9 6 1.9 5.5-1.9V4.5l-5.5 1.9-6-1.9z"
        fill={active ? "#224CFF" : "#9AA2B5"}
        stroke={active ? "#224CFF" : "#9AA2B5"}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon({ active }: { active?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="11"
        cy="11"
        r="6.5"
        stroke={active ? "#224CFF" : "#9AA2B5"}
        strokeWidth="1.4"
        fill="none"
      />
      <line
        x1="15.8"
        y1="15.8"
        x2="21"
        y2="21"
        stroke={active ? "#224CFF" : "#9AA2B5"}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CarIcon({ active }: { active?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="3"
        y="9"
        width="18"
        height="6"
        rx="2"
        fill={active ? "#224CFF" : "#9AA2B5"}
        opacity="0.15"
      />
      <path
        d="M4 14h16l-1 3H5l-1-3z"
        fill={active ? "#224CFF" : "#9AA2B5"}
      />
    </svg>
  );
}

function HeartIcon({ active }: { active?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20s-7-4.5-7-9c0-2.8 2.2-5 5-5 1.6 0 3 0.8 4 2 1-1.2 2.4-2 4-2 2.8 0 5 2.2 5 5 0 4.5-7 9-7 9z"
        fill={active ? "#224CFF" : "#9AA2B5"}
      />
    </svg>
  );
}

function UserIcon({ active }: { active?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="8"
        r="4"
        fill={active ? "#224CFF" : "#9AA2B5"}
      />
      <path
        d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"
        stroke={active ? "#224CFF" : "#9AA2B5"}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function CatalogIcon({ active }: { active?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" fill={active ? "#224CFF" : "#9AA2B5"} opacity="0.12" />
      <rect x="6" y="7" width="12" height="2" rx="1" fill={active ? "#224CFF" : "#9AA2B5"} />
      <rect x="6" y="11" width="8" height="2" rx="1" fill={active ? "#224CFF" : "#9AA2B5"} />
      <rect x="6" y="15" width="10" height="2" rx="1" fill={active ? "#224CFF" : "#9AA2B5"} />
    </svg>
  );
}

function OrdersIcon({ active }: { active?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z"
        fill={active ? "#224CFF" : "#9AA2B5"}
        opacity="0.12"
      />
      <path
        d="M8 9h8M8 13h6M8 17h4"
        stroke={active ? "#224CFF" : "#9AA2B5"}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BuildingIcon({ active }: { active?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 20h14V8l-7-4-7 4v12z"
        fill={active ? "#224CFF" : "#9AA2B5"}
        opacity="0.15"
      />
      <path
        d="M5 20h14"
        stroke={active ? "#224CFF" : "#9AA2B5"}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <rect x="9" y="12" width="2" height="2" rx="0.5" fill={active ? "#224CFF" : "#9AA2B5"} />
      <rect x="13" y="12" width="2" height="2" rx="0.5" fill={active ? "#224CFF" : "#9AA2B5"} />
      <rect x="11" y="16" width="2" height="4" rx="1" fill={active ? "#224CFF" : "#9AA2B5"} />
    </svg>
  );
}

function HelpIcon({ active }: { active?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke={active ? "#224CFF" : "#9AA2B5"} strokeWidth="1.6" fill="none" />
      <path
        d="M12 16v-1.5c0-1 .7-1.5 1.2-1.9.5-.4.8-.8.8-1.4A2.3 2.3 0 0011.7 9c-1.2 0-2 .7-2.4 1.6"
        stroke={active ? "#224CFF" : "#9AA2B5"}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12" cy="18" r="1" fill={active ? "#224CFF" : "#9AA2B5"} />
    </svg>
  );
}
