import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/brand/Logo";

/**
 * AuthCard — wrapper visuel partagé par les pages login/register (et,
 * plus tard, forgot/reset-password). Centré verticalement/horizontalement
 * par `app/(auth)/layout.tsx`, largeur contrainte pour rester lisible sur
 * mobile (375px) comme sur desktop.
 */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex justify-center">
        <Logo variant="full" />
      </div>

      <Card className="p-6 sm:p-7">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-fg">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-fg-muted">{description}</p>
          )}
        </div>

        {children}
      </Card>

      {footer && <div className="mt-5 text-center text-sm">{footer}</div>}
    </div>
  );
}
