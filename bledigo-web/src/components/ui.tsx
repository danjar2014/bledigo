'use client';

import { Loader2, AlertCircle } from 'lucide-react';

export function Spinner({ label = 'Chargement...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-slate">
      <Loader2 className="w-5 h-5 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Une erreur est survenue';
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-bledi-sm p-4">
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        <div className="font-medium">{message}</div>
        <div className="text-sm text-red-700/80 mt-1">
          Verifiez que l API tourne sur {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}.
        </div>
      </div>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center py-16 text-slate bg-white rounded-bledi border border-cloud">
      {children}
    </div>
  );
}
