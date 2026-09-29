"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Store,
  ClipboardList,
  LayoutDashboard,
  UserCheck,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";

type UserRole = "crew" | "manager";

interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const roleLinks: Record<UserRole, NavLink[]> = {
  crew: [
    {
      href: "/counter/cnt-01",
      label: "Stock Intake Form",
      icon: <ClipboardList className="w-4 h-4" />,
    },
  ],
  manager: [
    {
      href: "/manager/dashboard",
      label: "Operations Dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
  ],
};

const roleLanding: Record<UserRole, string> = {
  crew: "/counter/cnt-01",
  manager: "/manager/dashboard",
};

const roleConfig: Record<
  UserRole,
  { label: string; dotColor: string; icon: React.ReactNode }
> = {
  crew: {
    label: "Counter Crew",
    dotColor: "bg-green-500",
    icon: <UserCheck className="w-4 h-4" />,
  },
  manager: {
    label: "Operations Manager",
    dotColor: "bg-amber-500",
    icon: <ShieldAlert className="w-4 h-4" />,
  },
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("crew");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load role from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("user_role") as UserRole | null;
    if (stored === "crew" || stored === "manager") {
      setRole(stored);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleRoleChange(newRole: UserRole) {
    setRole(newRole);
    localStorage.setItem("user_role", newRole);
    setDropdownOpen(false);
    router.push(roleLanding[newRole]);
  }

  const links = roleLinks[role];
  const currentRoleConfig = roleConfig[role];

  return (
    <header className="bg-slate-900 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white">
              <Store className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white tracking-tight">
                GRS Retail
              </span>
              <span className="hidden sm:inline-flex items-center rounded-full bg-slate-700 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                23 COUNTERS
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-slate-700 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Role Switcher Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
            >
              <span
                className={`w-2 h-2 rounded-full ${currentRoleConfig.dotColor}`}
              />
              <span className="hidden sm:inline">{currentRoleConfig.label}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-xl border border-gray-200 py-1 z-50">
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Switch Role
                </div>
                {(Object.keys(roleConfig) as UserRole[]).map((r) => {
                  const config = roleConfig[r];
                  const isCurrent = r === role;
                  return (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(r)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                        isCurrent
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${config.dotColor}`}
                      />
                      <span className="flex items-center gap-2">
                        {config.icon}
                        {config.label}
                      </span>
                      {isCurrent && (
                        <span className="ml-auto text-xs font-semibold text-blue-600">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-3 flex items-center gap-1 overflow-x-auto">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
