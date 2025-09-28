'use client';

import {
  createContext,
  useContext,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

interface ReasoningContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  isStreaming?: boolean;
}

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

interface ReasoningProps extends HTMLAttributes<HTMLDivElement> {
  isStreaming?: boolean;
}

export function Reasoning({ className, children, isStreaming, ...props }: ReasoningProps) {
  const [open, setOpen] = useState(false);
  return (
    <ReasoningContext.Provider value={{ open, setOpen, isStreaming }}>
      <div className={cn('flex flex-col gap-2', className)} {...props}>
        {children}
      </div>
    </ReasoningContext.Provider>
  );
}

export function ReasoningTrigger({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = useReasoningContext();
  const label = context.open ? 'Hide reasoning' : 'Show reasoning';
  return (
    <button
      type="button"
      className={cn('inline-flex items-center gap-2 self-start rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm', className)}
      onClick={() => context.setOpen(!context.open)}
      {...props}
    >
      {children ?? label}
      {context.isStreaming && (
        <span className="text-[10px] font-semibold text-emerald-600">Streaming…</span>
      )}
    </button>
  );
}

export function ReasoningContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const context = useReasoningContext();
  if (!context.open) {
    return null;
  }
  return (
    <div className={cn('rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700', className)} {...props}>
      {children}
    </div>
  );
}

function useReasoningContext() {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error('Reasoning components must be used within Reasoning');
  }
  return context;
}
