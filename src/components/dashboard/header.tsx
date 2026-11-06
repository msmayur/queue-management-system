
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Loader2 } from "lucide-react";
import { signOut } from "@/lib/auth-client";

interface HeaderProps {
  title: string;
  description: string;
}

export default function Header({
  title,
  description,
}: HeaderProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
  try {
    setSigningOut(true);

    const result = await signOut();

    if (result.error) {
      console.error("Sign out error:", result.error);
      return;
    }

    router.replace("/login");
    router.refresh();
  } catch (error) {
    console.error("Sign out failed:", error);
  } finally {
    setSigningOut(false);
  }
}

  return (
    <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="rounded-lg border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-100"
        >
          <Bell size={19} />
        </button>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
          M
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {signingOut ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <LogOut size={17} />
          )}

          <span>{signingOut ? "Signing out..." : "Sign out"}</span>
        </button>
      </div>
    </header>
  );
}
