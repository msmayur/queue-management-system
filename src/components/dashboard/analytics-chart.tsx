
"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendItem = {
  hour: string;
  waitingTokens: number;
};

export default function AnalyticsChart({
  data,
}: {
  data: TrendItem[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-6">
        <h2 className="font-semibold text-slate-900">
          Queue length trend
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Hourly waiting-token count
        </p>
      </div>

      {data.length === 0 ? (
        <div className="flex h-72 items-center justify-center text-sm text-slate-500">
          No queue activity available.
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 10,
                right: 20,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="hour"
                tick={{ fontSize: 12 }}
              />

              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12 }}
              />

              <Tooltip />

              <Line
                type="monotone"
                dataKey="waitingTokens"
                name="Waiting tokens"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
