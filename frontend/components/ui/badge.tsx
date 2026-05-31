import * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = {
  default: 'bg-slate-800 text-slate-100',
  secondary: 'bg-slate-900 text-slate-200',
  accent: 'bg-sky-500/10 text-sky-200',
  destructive: 'bg-rose-500/10 text-rose-200'
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof badgeVariants;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant = 'default', ...props }, ref) => (
  <span
    ref={ref}
    className={cn('inline-flex rounded-full px-3 py-1 text-xs font-medium tracking-[0.2em] uppercase', badgeVariants[variant], className)}
    {...props}
  />
));
Badge.displayName = 'Badge';

export { Badge };
