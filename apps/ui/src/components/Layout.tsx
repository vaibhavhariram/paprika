import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center gap-3">
        <span className="text-lg font-semibold tracking-tight text-zinc-100">
          Paprika
        </span>
        <span className="text-xs text-zinc-500 font-mono">trace viewer</span>
      </header>
      <main className="flex-1 px-6 py-6 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
