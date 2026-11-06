
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ListOrdered,
  ChartNoAxesCombined,
  LogOut,
  Layers,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { useState } from "react";

const navigation = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Queues",
    href: "/dashboard/queues",
    icon: ListOrdered,
  },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: ChartNoAxesCombined,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    try {
      setLoading(true);
      await signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="flex min-h-screen w-full flex-col border-b border-slate-800 bg-slate-950 text-white md:w-64 md:border-r md:border-b-0">
      <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
          <Layers size={22} />
        </div>

        <div>
          <h1 className="text-lg font-bold tracking-tight">
            QueueFlow
          </h1>
          <p className="text-xs text-slate-400">
            Management system
          </p>
        </div>
      </div>

      <div className="flex-1 px-4 py-6">
        <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Workspace
        </p>

        <nav className="flex gap-2 md:flex-col">
          {navigation.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <item.icon size={19} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-800 p-4">
        <button
          onClick={handleLogout}
          disabled={loading}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
        >
          <LogOut size={19} />
          {loading ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </aside>
  );
}
