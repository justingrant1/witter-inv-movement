"use client";

import { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  type = "button",
  disabled,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
}) {
  const styles =
    variant === "primary"
      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold"
      : variant === "danger"
      ? "bg-rose-500 hover:bg-rose-400 text-white font-semibold"
      : "bg-slate-700 hover:bg-slate-600 text-slate-100";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2.5 text-sm transition disabled:opacity-40 disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-300">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const fieldClasses =
  "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none";

export function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      className={fieldClasses}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      className={fieldClasses}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-400">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
      {label}
    </div>
  );
}
