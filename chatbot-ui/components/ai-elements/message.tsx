import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface MessageProps extends HTMLAttributes<HTMLDivElement> {
  from: 'user' | 'assistant' | string;
}

export function Message({ from, className, ...props }: MessageProps) {
  const alignment = from === 'user' ? 'items-end' : 'items-start';
  return (
    <div className={cn('flex flex-col gap-2', alignment, className)} {...props} />
  );
}

interface MessageContentProps extends HTMLAttributes<HTMLDivElement> {
  from?: 'user' | 'assistant' | string;
}

export function MessageContent({ from, className, ...props }: MessageContentProps) {
  const baseStyles = 'text-sm leading-relaxed text-slate-900 dark:text-slate-100';
  const variantStyles =
    from === 'user'
      ? 'max-w-[75%] rounded-2xl bg-slate-200 px-4 py-2 text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
      : 'max-w-[75%]';
  return (
    <div className={cn(baseStyles, variantStyles, className)} {...props} />
  );
}
