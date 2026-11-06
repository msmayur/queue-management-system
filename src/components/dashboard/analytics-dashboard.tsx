
"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2, RefreshCw } from "lucide-react";

import AnalyticsChart from "@/components/dashboard/analytics-chart";

type AnalyticsData = {
  date: string;
  summary: {
    totalQueues: number;
    totalTokens: number;
    tokensGeneratedToday: number;
    waitingTokens: number;
    servingTokens: number;
    completedToday: number;
    cancelledToday: number;
    averageWaitingTime: number;
    averageServiceTime: number;
  };
  queueLengthTrend: {
    hour: string;
    waitingTokens: number;
  }[];
  queues: {
    id: string;
    name: string;
    totalTokens: number;
    waitingTokens: number;
    servingTokens: number;
    completedToday: number;
  }[];
};

function getTodayIndia() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [date, setDate] = useState(getTodayIndia);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadAnalytics() {
      try {
        setError("");

        const response = await fetch(
          `/api/analytics?date=${date}`
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Failed to fetch analytics"
          );
        }

        if (!ignore) {
          setData(result);
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong"
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      ignore = true;
    };
  }, [date, refreshKey]);

  return (
    <div className="space-y-6">
      {/* Date filter */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-semibold text-slate-900">
            Performance overview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Review queue performance for a selected date.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays size={18} className="text-slate-500" />

          <input
            type="date"
            value={date}
            max={getTodayIndia()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setRefreshKey((prev) => prev + 1);
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20">
          <Loader2 size={24} className="animate-spin text-slate-500" />
          <span className="ml-3 text-sm text-slate-500">
            Loading analytics...
          </span>
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total tokens"
              value={data.summary.totalTokens}
              description="Generated across all your queues"
            />

            <StatCard
              title="Generated today"
              value={data.summary.tokensGeneratedToday}
              description="New tokens on selected date"
            />

            <StatCard
              title="Waiting"
              value={data.summary.waitingTokens}
              description="Current waiting tokens"
            />

            <StatCard
              title="Currently serving"
              value={data.summary.servingTokens}
              description="Active service tokens"
            />

            <StatCard
              title="Completed today"
              value={data.summary.completedToday}
              description="Successfully completed tokens"
            />

            <StatCard
              title="Cancelled today"
              value={data.summary.cancelledToday}
              description="Cancelled tokens"
            />

            <StatCard
              title="Average waiting time"
              value={`${data.summary.averageWaitingTime} min`}
              description="Creation to service assignment"
            />

            <StatCard
              title="Average service time"
              value={`${data.summary.averageServiceTime} min`}
              description="Service assignment to completion"
            />
          </div>

          {/* Chart */}
          <AnalyticsChart data={data.queueLengthTrend} />

          {/* Per-queue statistics */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">
              Queue performance
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current queue status and selected-date completions.
            </p>

            {data.queues.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                No queues available.
              </p>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-3 font-medium">Queue</th>
                      <th className="pb-3 font-medium">Total tokens</th>
                      <th className="pb-3 font-medium">Waiting</th>
                      <th className="pb-3 font-medium">Serving</th>
                      <th className="pb-3 font-medium">Completed</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.queues.map((queue) => (
                      <tr
                        key={queue.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="py-4 font-medium text-slate-900">
                          {queue.name}
                        </td>
                        <td className="py-4 text-slate-600">
                          {queue.totalTokens}
                        </td>
                        <td className="py-4 text-slate-600">
                          {queue.waitingTokens}
                        </td>
                        <td className="py-4 text-slate-600">
                          {queue.servingTokens}
                        </td>
                        <td className="py-4 text-slate-600">
                          {queue.completedToday}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
