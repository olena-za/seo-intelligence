import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: 'left' | 'right';
}

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, SheetContentProps>(
  ({ className, side = 'right', ...props }, ref) => {
    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/80" />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            'fixed z-50 h-full bg-slate-950 p-6 shadow-panel',
            side === 'left' ? 'left-0 animate-in slide-in-from-left w-72' : 'right-0 animate-in slide-in-from-right w-72',
            className
          )}
          {...props}
        />
      </DialogPrimitive.Portal>
    );
  }
);
SheetContent.displayName = DialogPrimitive.Content.displayName;

export { Sheet, SheetTrigger, SheetContent };
