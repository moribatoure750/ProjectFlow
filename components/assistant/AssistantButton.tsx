"use client";

import { MessageSquareIcon, XIcon } from "@/components/ui/icons";

/**
 * Bouton flottant de l'assistant ProjectFlow — toujours visible en bas
 * à droite de l'application (monté par `AppShell`, voir
 * `components/assistant/AssistantWidget.tsx`), sur le même principe
 * "toujours accessible" que `NotificationBell`/`UserMenu` dans le
 * Header, mais volontairement en dehors du Header pour rester visible
 * même en scrollant une longue page.
 */
export interface AssistantButtonProps {
  open: boolean;
  onClick: () => void;
}

export function AssistantButton({ open, onClick }: AssistantButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Fermer l'assistant ProjectFlow" : "Ouvrir l'assistant ProjectFlow"}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls="projectflow-assistant-panel"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-transform duration-150 ease-out hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-95"
    >
      {open ? <XIcon className="h-6 w-6" /> : <MessageSquareIcon className="h-6 w-6" />}
    </button>
  );
}
