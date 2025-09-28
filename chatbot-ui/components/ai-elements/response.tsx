import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Response({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('leading-relaxed', className)} {...props} />;
}
