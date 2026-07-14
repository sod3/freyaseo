"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const trend = [
  { month: "Jan", traffic: 22, leads: 8, mentions: 3 },
  { month: "Feb", traffic: 28, leads: 11, mentions: 5 },
  { month: "Mar", traffic: 35, leads: 14, mentions: 7 },
  { month: "Apr", traffic: 48, leads: 19, mentions: 10 },
  { month: "May", traffic: 58, leads: 24, mentions: 13 },
  { month: "Jun", traffic: 71, leads: 31, mentions: 18 },
];

const visibility = [
  { name: "Top 3", value: 24 },
  { name: "Top 10", value: 58 },
  { name: "AI", value: 38 },
  { name: "Leads", value: 31 },
];

export function PerformanceDashboard({
  title,
  text,
  labels = {
    eyebrow: "Demo performance model",
    status: "Live-ready",
    area: "Organic traffic and leads",
    bars: "Visibility mix",
  },
}: {
  title: string;
  text: string;
  labels?: {
    eyebrow: string;
    status: string;
    area: string;
    bars: string;
  };
}) {
  return (
    <div className="dashboard-shell">
      <div className="dashboard-header">
        <div>
          <p>{labels.eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <span>{labels.status}</span>
      </div>
      <p className="dashboard-text">{text}</p>
      <div className="dashboard-grid">
        <div className="chart-panel chart-panel-large">
          <div className="chart-label">{labels.area}</div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend} margin={{ top: 12, right: 12, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="traffic" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#3ee98f" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#3ee98f" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="leads" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#d7f76b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#d7f76b" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(200,255,220,.09)" vertical={false} />
              <XAxis dataKey="month" stroke="rgba(236,255,242,.62)" tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(236,255,242,.62)" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#082014", border: "1px solid rgba(134,239,172,.25)", borderRadius: 8 }} />
              <Area type="monotone" dataKey="traffic" stroke="#3ee98f" fill="url(#traffic)" strokeWidth={3} />
              <Area type="monotone" dataKey="leads" stroke="#d7f76b" fill="url(#leads)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-panel">
          <div className="chart-label">{labels.bars}</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={visibility} margin={{ top: 12, right: 4, bottom: 0, left: -24 }}>
              <CartesianGrid stroke="rgba(200,255,220,.08)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(236,255,242,.62)" tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(236,255,242,.62)" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#082014", border: "1px solid rgba(134,239,172,.25)", borderRadius: 8 }} />
              <Bar dataKey="value" fill="#53f1a0" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
