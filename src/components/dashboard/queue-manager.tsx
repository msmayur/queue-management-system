
"use client";

import { useEffect, useState } from "react";
import { Plus, X, Layers, Loader2 } from "lucide-react";

type Queue = {
  id: string;
  name: string;
  createdAt: string;
  _count: {
    tokens: number;
  };
};

export default function QueueManager() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadQueues() {
      try {
        setError("");

        const response = await fetch("/api/queues");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch queues");
        }

        if (!ignore) {
          setQueues(data.queues);
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

    void loadQueues();

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  async function handleCreateQueue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedName = name.trim();

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setError("Queue name must contain 2–50 characters.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const response = await fetch("/api/queues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create queue");
      }

      setName("");
      setShowForm(false);

      setLoading(true);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Your Queues
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage your service queues.
          </p>
        </div>

        <button
          onClick={() => {
            setError("");
            setShowForm(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          <Plus size={18} />
          Create Queue
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">
              Create a new queue
            </h3>

            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setName("");
                setError("");
              }}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close form"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleCreateQueue} className="space-y-4">
            <div>
              <label
                htmlFor="queueName"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Queue name
              </label>

              <input
                id="queueName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. General Consultation"
                maxLength={50}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating && <Loader2 size={16} className="animate-spin" />}
              {creating ? "Creating..." : "Create Queue"}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
          <Loader2 className="animate-spin text-slate-500" size={24} />
          <span className="ml-3 text-sm text-slate-500">
            Loading queues...
          </span>
        </div>
      ) : queues.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <Layers size={26} className="text-slate-500" />
          </div>

          <h3 className="mt-4 font-semibold text-slate-900">
            No queues created yet
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Create your first queue to start managing customer tokens.
          </p>

          <button
            onClick={() => setShowForm(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            <Plus size={18} />
            Create your first queue
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {queues.map((queue) => (
            <div
              key={queue.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                  <Layers size={21} className="text-slate-700" />
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  Active
                </span>
              </div>

              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {queue.name}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Created{" "}
                {new Date(queue.createdAt).toLocaleDateString()}
              </p>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-sm text-slate-500">Total tokens</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {queue._count.tokens}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
