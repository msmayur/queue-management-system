
"use client";

import { useEffect, useState } from "react";
import {
    ArrowDown,
    ArrowUp,
    Check,
    Clock,
    Loader2,
    Plus,
    RefreshCw,
    UserRound,
    X,
} from "lucide-react";


type Queue = {
    id: string;
    name: string;
    createdAt: string;
    _count: {
        tokens: number;
    };
};

type Token = {
    id: string;
    tokenNumber: number;
    personName: string;
    position: number;
    status: "WAITING" | "SERVING" | "COMPLETED" | "CANCELLED";
    createdAt: string;
    assignedAt: string | null;
    completedAt: string | null;
};

type TokenResponse = {
    queue: {
        id: string;
        name: string;
    };
    tokens: Token[];
};

export default function QueueWorkspace() {
    const [queues, setQueues] = useState<Queue[]>([]);
    const [selectedQueueId, setSelectedQueueId] = useState("");
    const [tokens, setTokens] = useState<Token[]>([]);
    const [servingToken, setServingToken] = useState<Token | null>(null);
    const [queueName, setQueueName] = useState("");
    const [queueRefreshKey, setQueueRefreshKey] = useState(0);
    const [tokenRefreshKey, setTokenRefreshKey] = useState(0);

    const [personName, setPersonName] = useState("");
    const [loadingQueues, setLoadingQueues] = useState(true);
    const [loadingTokens, setLoadingTokens] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        let ignore = false;

        async function loadQueues() {
            try {

                const response = await fetch("/api/queues");
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Failed to load queues");
                }

                if (!ignore) {
                    setQueues(data.queues);

                    setSelectedQueueId((current) => {
                        if (
                            current &&
                            data.queues.some((q: Queue) => q.id === current)
                        ) {
                            return current;
                        }

                        return data.queues[0]?.id ?? "";
                    });
                }
            } catch (err) {
                if (!ignore) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load queues"
                    );
                }
            } finally {
                if (!ignore) {
                    setLoadingQueues(false);
                }
            }
        }

        void loadQueues();

        return () => {
            ignore = true;
        };
    }, [queueRefreshKey]);

    useEffect(() => {
        let ignore = false;

        async function loadTokens() {
            if (!selectedQueueId) {
                return;
            }

            try {

                const response = await fetch(
                    `/api/queues/${selectedQueueId}/tokens`
                );

                const data: TokenResponse & { message?: string } =
                    await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Failed to load tokens");
                }

                if (!ignore) {
                    setTokens(
                        data.tokens.filter(
                            (token) => token.status === "WAITING"
                        )
                    );

                    setServingToken(
                        data.tokens.find(
                            (token) => token.status === "SERVING"
                        ) ?? null
                    );
                }
            } catch (err) {
                if (!ignore) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load tokens"
                    );
                }
            } finally {
                if (!ignore) {
                    setLoadingTokens(false);
                }
            }
        }

        void loadTokens();

        return () => {
            ignore = true;
        };
    }, [selectedQueueId, tokenRefreshKey]);

    async function performAction(
        url: string,
        method: "POST" | "PATCH",
        body?: object
    ) {
        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Request failed");
        }

        return data;
    }


    async function handleCreateQueue(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const trimmedName = queueName.trim();

        if (trimmedName.length < 2 || trimmedName.length > 50) {
            setError("Queue name must contain between 2 and 50 characters.");
            return;
        }

        try {
            setSubmitting(true);
            setError("");
            setSuccess("");

            const data = await performAction(
                "/api/queues",
                "POST",
                { name: trimmedName }
            );

            setQueueName("");
            setSuccess(`Queue "${data.queue.name}" created successfully.`);

            setLoadingQueues(true);
            setQueueRefreshKey(prev => prev + 1);
            setSelectedQueueId(data.queue.id);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to create queue"
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function handleAddPerson(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!selectedQueueId) return;

        const trimmedName = personName.trim();

        if (trimmedName.length < 2 || trimmedName.length > 80) {
            setError("Name must contain between 2 and 80 characters.");
            return;
        }

        try {
            setSubmitting(true);
            setError("");
            setSuccess("");

            const data = await performAction(
                `/api/queues/${selectedQueueId}/tokens`,
                "POST",
                { personName: trimmedName }
            );

            setPersonName("");
            setSuccess(
                `Token #${data.token.tokenNumber} generated for ${data.token.personName}.`
            );

            setLoadingQueues(true);
            setLoadingTokens(true);

            setQueueRefreshKey((prev) => prev + 1);
            setTokenRefreshKey((prev) => prev + 1);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to generate token"
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function handleAssignNext() {
        if (!selectedQueueId) return;

        try {
            setSubmitting(true);
            setError("");
            setSuccess("");

            const data = await performAction(
                `/api/queues/${selectedQueueId}/assign`,
                "POST"
            );

            setSuccess(
                `Token #${data.token.tokenNumber} is now being served.`
            );

            setLoadingTokens(true);
            setTokenRefreshKey(prev => prev + 1);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to assign token"
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function handleTokenAction(
        tokenId: string,
        action: "complete" | "cancel"
    ) {
        if (!selectedQueueId) return;

        try {
            setSubmitting(true);
            setError("");
            setSuccess("");

            await performAction(
                `/api/queues/${selectedQueueId}/tokens/${tokenId}`,
                "PATCH",
                { action }
            );

            setSuccess(
                action === "complete"
                    ? "Token completed successfully."
                    : "Token cancelled successfully."
            );

            setLoadingQueues(true);
            setLoadingTokens(true);

            setQueueRefreshKey((prev) => prev + 1);
            setTokenRefreshKey((prev) => prev + 1);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Token operation failed"
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function handleReorder(
        tokenId: string,
        direction: "up" | "down"
    ) {
        if (!selectedQueueId) return;

        try {
            setSubmitting(true);
            setError("");
            setSuccess("");

            await performAction(
                `/api/queues/${selectedQueueId}/tokens/reorder`,
                "POST",
                { tokenId, direction }
            );

            setLoadingTokens(true);
            setTokenRefreshKey(prev => prev + 1);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to reorder token"
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (loadingQueues) {
        return (
            <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
                <Loader2 className="animate-spin text-slate-900" size={24} />
                <span className="ml-3 text-sm text-slate-900">
                    Loading queues...
                </span>
            </div>
        );
    }



    return (
        <div className="space-y-6">

            {/* Create queue */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="font-semibold text-slate-900">
                    Create a new queue
                </h2>

                <p className="mt-1 text-sm text-slate-900">
                    Create a queue to start managing customers and tokens.
                </p>

                <form
                    onSubmit={handleCreateQueue}
                    className="mt-5 flex flex-col gap-3 sm:flex-row"
                >
                    <input
                        type="text"
                        value={queueName}
                        onChange={(e) => setQueueName(e.target.value)}
                        placeholder="Enter queue name"
                        maxLength={50}
                        required
                        className="min-w-0 flex-1 rounded-xl border text-slate-700 border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                    />

                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                        {submitting ? (
                            <Loader2 size={17} className="animate-spin" />
                        ) : (
                            <Plus size={17} />
                        )}
                        Create Queue
                    </button>
                </form>
            </section>
            {/* Queue selector */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-semibold text-slate-900">
                            Select queue
                        </h2>
                        <p className="mt-1 text-sm text-slate-900">
                            Choose which queue you want to manage.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setLoadingQueues(true);
                            setLoadingTokens(true);

                            setQueueRefreshKey((prev) => prev + 1);
                            setTokenRefreshKey((prev) => prev + 1);
                        }}
                        disabled={loadingQueues || loadingTokens}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <RefreshCw
                            size={16}
                            className={loadingQueues || loadingTokens ? "animate-spin" : ""}
                        />
                        Refresh
                    </button>
                </div>

                <select
                    value={selectedQueueId}
                    onChange={(e) => {
                        setSelectedQueueId(e.target.value);
                        setError("");
                        setSuccess("");
                    }}
                    className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 sm:max-w-md"
                >
                    {queues.map((queue) => (
                        <option key={queue.id} value={queue.id}>
                            {queue.name}
                        </option>
                    ))}
                </select>
            </section>

            {/* Alerts */}
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                    {success}
                </div>
            )}

            {/* Add person */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="font-semibold text-slate-900">
                    Add person to queue
                </h2>
                <p className="mt-1 text-sm text-slate-900">
                    Enter the person&apos;s name to generate a token.
                </p>

                <form
                    onSubmit={handleAddPerson}
                    className="mt-5 flex flex-col gap-3 sm:flex-row"
                >
                    <input
                        type="text"
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        placeholder="Enter person&apos;s name"
                        maxLength={80}
                        required
                        className="min-w-0 flex-1 text-slate-700 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                    />

                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                        {submitting ? (
                            <Loader2 size={17} className="animate-spin" />
                        ) : (
                            <Plus size={17} />
                        )}
                        Generate token
                    </button>
                </form>
            </section>


            {/* Currently serving */}
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-emerald-900">
                            Currently serving
                        </h2>
                        <p className="mt-1 text-sm text-emerald-700">
                            The customer currently assigned for service.
                        </p>
                    </div>

                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                        {servingToken ? "In service" : "No active service"}
                    </span>
                </div>

                {servingToken ? (
                    <div className="mt-5 flex flex-col gap-4 rounded-xl border border-emerald-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 font-bold text-emerald-800">
                                #{servingToken.tokenNumber}
                            </div>

                            <div>
                                <h3 className="font-semibold text-slate-900">
                                    {servingToken.personName}
                                </h3>
                                <p className="mt-1 text-xs text-slate-900">
                                    Service started{" "}
                                    {servingToken.assignedAt
                                        ? new Date(servingToken.assignedAt).toLocaleTimeString()
                                        : ""}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                handleTokenAction(servingToken.id, "complete")
                            }
                            disabled={submitting}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            <Check size={17} />
                            Complete service
                        </button>
                    </div>
                ) : (
                    <p className="mt-5 rounded-xl border border-dashed border-emerald-200 bg-white p-6 text-center text-sm text-slate-900">
                        No customer is currently being served. Assign the next waiting token.
                    </p>
                )}
            </section>


            {/* Waiting tokens */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-semibold text-slate-900">
                            Waiting tokens
                        </h2>
                        <p className="mt-1 text-sm text-slate-900">
                            {tokens.length} people waiting
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleAssignNext}
                        disabled={submitting || loadingTokens || tokens.length === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <UserRound size={17} />
                        Assign next
                    </button>
                </div>

                {loadingTokens ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-slate-900" size={22} />
                        <span className="ml-3 text-sm text-slate-900">
                            Loading tokens...
                        </span>
                    </div>
                ) : tokens.length === 0 ? (
                    <div className="py-12 text-center">
                        <Clock className="mx-auto text-slate-400" size={32} />
                        <p className="mt-3 text-sm text-slate-900">
                            No waiting tokens in this queue.
                        </p>
                    </div>
                ) : (
                    <div className="mt-5 space-y-3">
                        {tokens.map((token, index) => (
                            <div
                                key={token.id}
                                className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex min-w-0 items-center gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-800">
                                        #{token.tokenNumber}
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="truncate font-medium text-slate-900">
                                            {token.personName}
                                        </h3>
                                        <p className="mt-1 text-xs text-slate-900">
                                            Waiting position: {token.position}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleReorder(token.id, "up")}
                                        disabled={submitting || index === 0}
                                        aria-label="Move token up"
                                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                                    >
                                        <ArrowUp size={17} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleReorder(token.id, "down")}
                                        disabled={submitting || index === tokens.length - 1}
                                        aria-label="Move token down"
                                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                                    >
                                        <ArrowDown size={17} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleTokenAction(token.id, "cancel")}
                                        disabled={submitting}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                    >
                                        <X size={15} />
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
