'use client';

import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

type ConversationProps = HTMLAttributes<HTMLDivElement>;

export function Conversation({ className, ...props }: ConversationProps) {
  return <div className={cn('flex flex-col gap-4', className)} {...props} />;
}

export function ConversationContent({ className, ...props }: ConversationProps) {
  return <div className={cn('flex-1 overflow-y-auto space-y-4 pr-2', className)} {...props} />;
}

export function ConversationScrollButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const scrollRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  });

  return (
    <button
      ref={scrollRef}
      type="button"
      className={cn('sr-only', className)}
      aria-hidden
      tabIndex={-1}
      {...props}
    />
  );
}
