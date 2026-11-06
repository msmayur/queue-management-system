
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Layers,
  Users,
  Clock,
  CheckCircle2,
  ArrowRight,
  Loader2,
  RefreshCw,
} from "lucide-react";

import Header from "@/components/dashboard/header";

type DashboardData = {
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
  queues: {
    id: string;
    name: string;
    totalTokens: number;
    waitingTokens: number;
    servingTokens: number;
    completedToday: number;
  }[];
};

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
          <Icon size={20} className="text-slate-700" />
        </div>
      </div>

      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}

export default function DashboardOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      try {
        setError("");

        const response = await fetch("/api/analytics", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Failed to load dashboard"
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

    void loadDashboard();

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  return (
    <div className="min-h-screen p-5 sm:p-8">
      <Header
        title="Dashboard"
        description="Overview of your queue management system."
      />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Performance overview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Live statistics from your queues.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setRefreshKey((prev) => prev + 1);
          }}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setRefreshKey((prev) => prev + 1);
            }}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="mt-6 flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-20">
          <Loader2 size={24} className="animate-spin text-slate-500" />
          <span className="ml-3 text-sm text-slate-500">
            Loading dashboard...
          </span>
        </div>
      ) : data ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total queues"
              value={data.summary.totalQueues}
              description="Queues created by you"
              icon={Layers}
            />

            <StatCard
              title="Total tokens"
              value={data.summary.totalTokens}
              description="All-time generated tokens"
              icon={Users}
            />

            <StatCard
              title="Waiting tokens"
              value={data.summary.waitingTokens}
              description="Currently in waiting line"
              icon={Clock}
            />

            <StatCard
              title="Currently serving"
              value={data.summary.servingTokens}
              description="Customers being served"
              icon={CheckCircle2}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              title="Generated today"
              value={data.summary.tokensGeneratedToday}
              description="New tokens today"
              icon={Users}
            />

            <StatCard
              title="Completed today"
              value={data.summary.completedToday}
              description="Successfully served today"
              icon={CheckCircle2}
            />

            <StatCard
              title="Average waiting time"
              value={`${data.summary.averageWaitingTime} min`}
              description="For tokens assigned today"
              icon={Clock}
            />
          </div>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Your queues
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Current status of each queue.
                </p>
              </div>

              <Link
                href="/dashboard/queues"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-950"
              >
                Manage queues
                <ArrowRight size={16} />
              </Link>
            </div>

            {data.queues.length === 0 ? (
              <div className="py-12 text-center">
                <Layers
                  size={32}
                  className="mx-auto text-slate-400"
                />

                <h3 className="mt-3 font-medium text-slate-900">
                  No queues created yet
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Create your first queue to start managing tokens.
                </p>

                <Link
                  href="/dashboard/queues"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Create queue
                  <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {data.queues.map((queue) => (
                  <div
                    key={queue.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-900">
                        {queue.name}
                      </h3>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {queue.totalTokens} tokens
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-xs text-slate-500">Waiting</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">
                          {queue.waitingTokens}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Serving</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">
                          {queue.servingTokens}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Completed</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">
                          {queue.completedToday}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/queues"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700"
            >
              Manage queues
              <ArrowRight size={16} />
            </Link>

            <Link
              href="/dashboard/analytics"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View analytics
              <ArrowRight size={16} />
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
