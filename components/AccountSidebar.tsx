"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/account/settings", label: "Settings" },
  { href: "/account/usage", label: "Usage" },
  { href: "/account/subscription", label: "Subscription" },
];

export function AccountSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 md:w-52">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-teal-800/60">
        Account
      </p>
      <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-teal-50 text-teal-900"
                  : "text-teal-800/80 hover:bg-teal-50/70 hover:text-teal-900"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
