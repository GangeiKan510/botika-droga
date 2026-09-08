"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { logout } from "@/app/actions/auth";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/medications", label: "Medications" },
  { href: "/stock/in", label: "Stock In" },
  { href: "/stock/out", label: "Stock Out" },
  { href: "/inventory", label: "Inventory" },
  { href: "/alerts", label: "Alerts", badgeKey: "alerts" as const },
  { href: "/sales", label: "Sales" },
  { href: "/settings", label: "Settings" },
];

export function AppNav({
  ownerName,
  alertCount = 0,
}: {
  ownerName?: string | null;
  alertCount?: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="relative z-40 border-b border-teal-200/60 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm relative md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <HamburgerIcon open={menuOpen} />
            {alertCount > 0 ? (
              <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-red-500 md:hidden" />
            ) : null}
          </button>
          <Link
            href="/dashboard"
            className="text-2xl font-semibold tracking-tight text-teal-800"
          >
            StockRx
          </Link>
          <nav className="ml-3 hidden flex-wrap gap-1 md:flex">
            {nav.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={isActive(pathname, item.href)}
                badgeCount={item.badgeKey === "alerts" ? alertCount : undefined}
              />
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {ownerName ? (
            <span className="hidden max-w-40 truncate text-sm text-teal-800/80 sm:inline">
              {ownerName}
            </span>
          ) : null}
          <form action={logout} className="hidden sm:block">
            <button type="submit" className="btn btn-outline btn-sm">
              Sign out
            </button>
          </form>
        </div>
      </div>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-teal-950/20 md:hidden"
            aria-label="Close menu overlay"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-x-0 top-full z-50 border-b border-teal-200 bg-white shadow-lg md:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-3 py-3">
              {ownerName ? (
                <p className="px-3 pb-2 text-sm text-teal-800/70 sm:hidden">
                  Signed in as {ownerName}
                </p>
              ) : null}
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-xl px-3 py-3 text-base font-medium ${
                    isActive(pathname, item.href)
                      ? "bg-teal-50 text-teal-900"
                      : "text-teal-800 hover:bg-teal-50/70"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>{item.label}</span>
                  {item.badgeKey === "alerts" && alertCount > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                      {alertCount > 99 ? "99+" : alertCount}
                    </span>
                  ) : null}
                </Link>
              ))}
              <form
                action={logout}
                className="mt-2 border-t border-teal-100 pt-2 sm:hidden"
              >
                <button
                  type="submit"
                  className="btn btn-outline btn-block justify-start"
                >
                  Sign out
                </button>
              </form>
            </nav>
          </div>
        </>
      ) : null}
    </header>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  active,
  badgeCount,
}: {
  href: string;
  label: string;
  active: boolean;
  badgeCount?: number;
}) {
  const showBadge = typeof badgeCount === "number" && badgeCount > 0;
  const badgeText = badgeCount && badgeCount > 99 ? "99+" : String(badgeCount);

  return (
    <Link
      href={href}
      className={`btn btn-ghost btn-sm relative text-teal-900 ${
        active ? "bg-teal-50" : ""
      }`}
    >
      {label}
      {showBadge ? (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm"
          aria-label={`${badgeCount} alerts`}
        >
          {badgeText}
        </span>
      ) : null}
    </Link>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-3.5 w-4" aria-hidden>
      <span
        className={`absolute left-0 block h-0.5 w-4 rounded bg-teal-900 transition ${
          open ? "top-1.5 rotate-45" : "top-0"
        }`}
      />
      <span
        className={`absolute left-0 top-1.5 block h-0.5 w-4 rounded bg-teal-900 transition ${
          open ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`absolute left-0 block h-0.5 w-4 rounded bg-teal-900 transition ${
          open ? "top-1.5 -rotate-45" : "top-3"
        }`}
      />
    </span>
  );
}
