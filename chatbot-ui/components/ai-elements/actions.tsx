'use client';

import {
  createContext,
  useContext,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

interface ActionsContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ActionsContext = createContext<ActionsContextValue | null>(null);

export function Actions({ className, children }: HTMLAttributes<HTMLDivElement>) {
  const [open, setOpen] = useState(false);
  return (
    <ActionsContext.Provider value={{ open, setOpen }}>
      <div className={cn('relative flex items-center gap-2', className)}>{children}</div>
    </ActionsContext.Provider>
  );
}

export function Action({ label, onClick, children }: { label: string; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
      onClick={onClick}
      aria-label={label}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

export function ActionsTrigger({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = useContext(ActionsContext);
  if (!context) {
    throw new Error('ActionsTrigger must be used within Actions');
  }
  return (
    <button
      type="button"
      className={cn('rounded-md border border-slate-200 bg-white px-2 py-1 text-xs', className)}
      onClick={() => context.setOpen(!context.open)}
      {...props}
    >
      {children}
    </button>
  );
}

export function ActionsContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const context = useContext(ActionsContext);
  if (!context) {
    throw new Error('ActionsContent must be used within Actions');
  }
  if (!context.open) {
    return null;
  }
  return (
    <div
      className={cn('absolute right-0 top-full z-10 mt-2 min-w-[12rem] rounded-md border border-slate-200 bg-white p-2 shadow-lg', className)}
      {...props}
    />
  );
}
