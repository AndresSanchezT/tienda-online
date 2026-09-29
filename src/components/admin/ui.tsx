import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint, href }: { label: string; value: ReactNode; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="card block p-4 hover:border-brand">{body}</Link>
  ) : (
    <div className="card p-4">{body}</div>
  );
}

export function Badge({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`badge ${className}`}>{children}</span>;
}
