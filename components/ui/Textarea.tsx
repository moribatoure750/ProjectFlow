import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Textarea — styled wrapper around the native `<textarea>` element.
 * Same visual language as `Input` (border, radius, focus ring).
 *
 * Forwards its ref to the underlying `<textarea>` (needed e.g. by
 * `components/assistant/AssistantPanel.tsx` to auto-focus the field
 * when the assistant panel opens).
 */
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error = false, className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full min-h-[100px] rounded-md border bg-surface px-3 py-2.5 text-sm text-fg outline-none transition-colors duration-150 ease-out placeholder:text-fg-subtle",
        "focus:border-accent focus:ring-2 focus:ring-ring/20",
        error ? "border-danger-600" : "border-border",
        className
      )}
      aria-invalid={error || undefined}
      {...props}
    />
  );
});
