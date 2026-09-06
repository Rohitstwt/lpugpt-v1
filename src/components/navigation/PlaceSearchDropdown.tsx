"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, LocateFixed, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  type CampusPlace,
  type PlaceCategory,
} from "@/lib/maps/campus-coordinates";
import { cn } from "@/lib/utils";

const YOUR_LOCATION_ID = "__your_location__";

const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  block: "Block",
  institute: "School",
  facility: "Facility",
  food: "Food",
  bank: "Bank",
  sports: "Sports",
  medical: "Medical",
  hostel: "Hostel",
  shop: "Shop",
  admin: "Admin",
  landmark: "Gate",
};

const FILTERS: Array<{ id: "all" | PlaceCategory; label: string }> = [
  { id: "all", label: "All" },
  { id: "block", label: "Blocks" },
  { id: "institute", label: "Schools" },
  { id: "facility", label: "Facilities" },
  { id: "food", label: "Food" },
  { id: "hostel", label: "Hostels" },
  { id: "sports", label: "Sports" },
  { id: "landmark", label: "Gates" },
];

export function PlaceSearchDropdown({
  label,
  places,
  value,
  onChange,
  allowYourLocation = false,
  placeholder = "Search places…",
  highlight = false,
}: {
  label: string;
  places: CampusPlace[];
  value: string | null;
  onChange: (id: string | null) => void;
  allowYourLocation?: boolean;
  placeholder?: string;
  highlight?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | PlaceCategory>("all");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected =
    value === YOUR_LOCATION_ID
      ? { name: "Your location", category: null }
      : places.find((p) => p.id === value) ?? null;

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return places.filter((p) => {
      if (filter !== "all" && p.category !== filter) return false;
      if (!query) return true;
      return (
        p.name.toLowerCase().includes(query) ||
        p.id.includes(query) ||
        (p.description || "").toLowerCase().includes(query) ||
        CATEGORY_LABEL[p.category].toLowerCase().includes(query)
      );
    });
  }, [places, q, filter]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function select(id: string | null) {
    onChange(id);
    setOpen(false);
    setQ("");
    setFilter("all");
  }

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors",
          highlight
            ? "border-orange/35 bg-orange/10 ring-1 ring-orange/20"
            : "border-white/8 bg-bg-elevated/60 hover:bg-white/5",
          open && "ring-2 ring-orange/30"
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="min-w-0">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-text-muted">
            {label}
          </span>
          <span
            className={cn(
              "block truncate text-sm font-medium",
              selected ? "text-text" : "text-text-muted"
            )}
          >
            {selected?.name ?? placeholder}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-muted transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-2xl shadow-black/50"
          role="listbox"
        >
          <div className="border-b border-white/5 p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
              />
              <Input
                ref={searchRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type block, mall, hostel…"
                className="h-9 border-white/8 bg-surface pl-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                }}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] transition-colors",
                    filter === f.id
                      ? "bg-orange/20 text-orange"
                      : "text-text-muted hover:text-text"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto p-1">
            {allowYourLocation && (
              <button
                type="button"
                role="option"
                aria-selected={value === YOUR_LOCATION_ID}
                onClick={() => select(YOUR_LOCATION_ID)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/5",
                  value === YOUR_LOCATION_ID && "bg-orange/10"
                )}
              >
                <LocateFixed className="h-4 w-4 shrink-0 text-orange" />
                <span className="font-medium">Your location</span>
                {value === YOUR_LOCATION_ID && (
                  <Check className="ml-auto h-4 w-4 text-orange" />
                )}
              </button>
            )}

            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-text-muted">
                No places match &ldquo;{q}&rdquo;
              </p>
            ) : (
              filtered.map((place) => {
                const active = value === place.id;
                return (
                  <button
                    key={place.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => select(place.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/5",
                      active && "bg-orange/10"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{place.name}</p>
                      {place.description && (
                        <p className="truncate text-[11px] text-text-muted">
                          {place.description}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-[10px] capitalize"
                    >
                      {CATEGORY_LABEL[place.category]}
                    </Badge>
                    {active && (
                      <Check className="h-4 w-4 shrink-0 text-orange" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-white/5 px-3 py-2 text-[10px] text-text-muted">
            {filtered.length} of {places.length} places
          </div>
        </div>
      )}
    </div>
  );
}

export { YOUR_LOCATION_ID };
