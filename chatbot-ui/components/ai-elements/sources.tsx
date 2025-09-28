'use client';

import {
  createContext,
  useContext,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

interface SourcesContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SourcesContext = createContext<SourcesContextValue | null>(null);

export function Sources({ className, children }: HTMLAttributes<HTMLDivElement>) {
  const [open, setOpen] = useState(false);
  return (
    <SourcesContext.Provider value={{ open, setOpen }}>
      <div className={cn('relative flex flex-col gap-2', className)}>{children}</div>
    </SourcesContext.Provider>
  );
}

export function SourcesTrigger({ count, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { count: number }) {
  const context = useSourcesContext();
  return (
    <button
      type="button"
      className={cn('inline-flex items-center gap-2 self-start rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm', className)}
      onClick={() => context.setOpen(!context.open)}
      {...props}
    >
      Sources ({count})
    </button>
  );
}

export function SourcesContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const context = useSourcesContext();
  if (!context.open) {
    return null;
  }
  return (
    <div className={cn('flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-sm', className)} {...props}>
      {children}
    </div>
  );
}

export function Source({ href, title }: { href: string; title: string }) {
  return (
    <a className="truncate text-xs font-medium text-slate-700 underline" href={href} target="_blank" rel="noreferrer">
      {title}
    </a>
  );
}

function useSourcesContext() {
  const context = useContext(SourcesContext);
  if (!context) {
    throw new Error('Sources components must be used within Sources');
  }
  return context;
}
