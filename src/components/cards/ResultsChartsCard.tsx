"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResultsChartsCardData } from "@/types/ui-blocks";

const COLORS = ["#ff6a3d", "#9ca3af", "#6b7280", "#4b5563", "#d1d5db", "#374151"];

type ChartTab = "marks" | "grades" | "radar" | "attendance";

const tip = {
  contentStyle: {
    background: "#111",
    border: "1px solid #222",
    borderRadius: 6,
    fontSize: 12,
    color: "#eee",
  },
  labelStyle: { color: "#aaa" },
};

export function ResultsChartsCard({ data }: { data: ResultsChartsCardData }) {
  const tabs = (
    [
      { id: "marks" as const, show: data.marks.length > 0 },
      { id: "grades" as const, show: data.gradeDist.length > 0 },
      { id: "radar" as const, show: (data.gradePoints?.length ?? 0) > 0 },
      { id: "attendance" as const, show: (data.attendance?.length ?? 0) > 0 },
    ] as const
  ).filter((t) => t.show);

  const [tab, setTab] = useState<ChartTab>(tabs[0]?.id ?? "marks");
  const active = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id ?? "marks";

  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const measure = () => {
      const w = Math.floor(el.getBoundingClientRect().width);
      if (w > 0) setWidth(w);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const t1 = window.setTimeout(measure, 30);
    const t2 = window.setTimeout(measure, 150);
    return () => {
      ro.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  const height = 220;
  const ready = width >= 40;

  return (
    <Card className="border-white/8 bg-transparent shadow-none">
      <CardHeader className="flex-row items-center justify-between space-y-0 px-4 py-3 pb-1">
        <CardTitle className="text-sm font-medium">Charts</CardTitle>
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded px-2 py-0.5 text-[11px] capitalize transition-colors ${
                active === t.id
                  ? "bg-white/10 text-text"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {t.id}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <div ref={hostRef} className="h-[220px] w-full min-w-0 overflow-hidden">
          {!ready ? (
            <div className="flex h-full items-center justify-center text-xs text-text-muted">
              Loading chart…
            </div>
          ) : active === "marks" ? (
            <BarChart
              key="marks"
              width={width}
              height={height}
              data={data.marks}
              margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
            >
              <XAxis
                dataKey="courseCode"
                tick={{ fill: "#888", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#888", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip {...tip} />
              <Bar dataKey="marks" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {data.marks.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : active === "grades" ? (
            <PieChart key="grades" width={width} height={height}>
              <Pie
                data={data.gradeDist}
                dataKey="count"
                nameKey="grade"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={2}
                stroke="none"
                label={({ grade }) => grade}
              >
                {data.gradeDist.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...tip} />
            </PieChart>
          ) : active === "radar" && data.gradePoints?.length ? (
            <RadarChart
              key="radar"
              width={width}
              height={height}
              data={data.gradePoints}
              cx="50%"
              cy="50%"
              outerRadius="68%"
            >
              <PolarGrid stroke="#ffffff18" />
              <PolarAngleAxis
                dataKey="courseCode"
                tick={{ fill: "#888", fontSize: 11 }}
              />
              <Radar
                dataKey="gradePoint"
                stroke="#ff6a3d"
                fill="#ff6a3d"
                fillOpacity={0.25}
              />
              <Tooltip {...tip} />
            </RadarChart>
          ) : active === "attendance" && data.attendance?.length ? (
            <LineChart
              key="attendance"
              width={width}
              height={height}
              data={data.attendance}
              margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
            >
              <XAxis
                dataKey="courseCode"
                tick={{ fill: "#888", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#888", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip {...tip} />
              <Line
                type="monotone"
                dataKey="percentage"
                stroke="#ff6a3d"
                strokeWidth={2}
                dot={{ r: 3, fill: "#ff6a3d" }}
              />
            </LineChart>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-text-muted">
              No data for this chart
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
