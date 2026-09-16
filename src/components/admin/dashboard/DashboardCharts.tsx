"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { css } from "styled-system/css";

// Mock data - will be replaced with real data
const salesData = [
  { name: "Mon", sales: 4000, orders: 24 },
  { name: "Tue", sales: 3000, orders: 18 },
  { name: "Wed", sales: 5000, orders: 32 },
  { name: "Thu", sales: 2780, orders: 16 },
  { name: "Fri", sales: 1890, orders: 12 },
  { name: "Sat", sales: 2390, orders: 14 },
  { name: "Sun", sales: 3490, orders: 22 },
];

const orderStatusData = [
  { status: "Pending", count: 12 },
  { status: "Processing", count: 28 },
  { status: "Shipped", count: 45 },
  { status: "Delivered", count: 156 },
  { status: "Cancelled", count: 8 },
];

// Recharts renders its own SVG and cannot consume Panda's css() tokens, so
// these are the literal hex values from panda.config.ts's jewellery palette
// (gold.500 for the primary series, onyx.400/onyx.200 for chrome/gridlines).
const CHART_GOLD = "#b8933a"; // gold.500
const CHART_GOLD_LIGHT = "#dcc064"; // gold.300
const AXIS_COLOR = "#6b6864"; // onyx.400
const GRID_COLOR = "#c9c7c2"; // onyx.200

const gridStyle = css({
  fontFamily: "body",
  fontSize: "xs",
});

export function DashboardCharts() {
  return (
    <div className={css({ display: "grid", gap: "4", md: { gridTemplateColumns: "repeat(2, 1fr)" } })}>
      {/* Sales Chart */}
      <Card className={css({ borderRadius: "xl" })}>
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300} className={gridStyle}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="name" stroke={AXIS_COLOR} tick={{ fill: AXIS_COLOR, fontSize: 12 }} />
              <YAxis stroke={AXIS_COLOR} tick={{ fill: AXIS_COLOR, fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "#fffdf8",
                  border: "1px solid rgba(31,29,27,0.08)",
                  borderRadius: 12,
                  fontSize: 13,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Line
                type="monotone"
                dataKey="sales"
                stroke={CHART_GOLD}
                strokeWidth={2}
                dot={{ fill: CHART_GOLD, r: 3 }}
                activeDot={{ fill: CHART_GOLD_LIGHT, r: 5 }}
                name="Sales (₹)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Orders by Status */}
      <Card className={css({ borderRadius: "xl" })}>
        <CardHeader>
          <CardTitle>Orders by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300} className={gridStyle}>
            <BarChart data={orderStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="status" stroke={AXIS_COLOR} tick={{ fill: AXIS_COLOR, fontSize: 12 }} />
              <YAxis stroke={AXIS_COLOR} tick={{ fill: AXIS_COLOR, fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "#fffdf8",
                  border: "1px solid rgba(31,29,27,0.08)",
                  borderRadius: 12,
                  fontSize: 13,
                }}
              />
              <Bar dataKey="count" fill={CHART_GOLD} radius={[6, 6, 0, 0]} name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
