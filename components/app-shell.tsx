"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { name: "Dashboard", href: "/" },
  { name: "Items", href: "/items" },
  { name: "Counters", href: "/counters" },
  { name: "Stock Count", href: "/stock-count" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
                GRS
              </div>
              <span className="hidden text-lg font-semibold text-gray-900 sm:block">
                Physical Stock
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden items-center gap-1 md:flex">
              {navigation.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="hidden text-sm font-medium text-gray-500 hover:text-gray-700 sm:block"
              >
                Sign Out
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  {mobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-200 px-4 py-3 md:hidden">
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                      isActive
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
