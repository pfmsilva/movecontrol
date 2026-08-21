"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cx } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/permissions";

const ALL_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/equipment", label: "Equipamentos" },
  { href: "/checkpoints", label: "Checkpoints" },
  { href: "/users", label: "Utilizadores", adminOnly: true },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // Sem sessão (ex: página de login) — não mostra a barra de navegação.
  if (status !== "authenticated" || !session?.user) return null;

  const links = ALL_LINKS.filter((link) => !link.adminOnly || session.user.role === "ADMIN");

  return (
    <header className="no-print sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-700">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M4 7l8-4 8 4-8 4-8-4zm0 0v10l8 4m0-14v14m8-14v10l-8 4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="hidden sm:inline">MoveControl</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cx(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/scan"
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M4 7V4h3M20 7V4h-3M4 17v3h3m13-3v3h-3M4 12h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Scan
          </Link>

          <div className="hidden items-center gap-2 border-l border-gray-200 pl-2 md:flex">
            <div className="text-right leading-tight">
              <p className="text-xs font-semibold text-gray-800">{session.user.name}</p>
              <p className="text-[11px] text-gray-400">{ROLE_LABELS[session.user.role]}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              title="Terminar sessão"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      <nav className="no-print flex items-center justify-between gap-1 overflow-x-auto border-t border-gray-100 px-3 py-1.5 sm:hidden">
        <div className="flex items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cx(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium",
                  active ? "bg-brand-50 text-brand-700" : "text-gray-600"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500"
        >
          Sair
        </button>
      </nav>
    </header>
  );
}
