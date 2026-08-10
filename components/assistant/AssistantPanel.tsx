"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Textarea } from "@/components/ui/Textarea";
import { MessageSquareIcon, SendIcon, TrashIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { AssistantChatMessage } from "@/hooks/useAssistant";

/**
 * Panneau de chat de l'assistant ProjectFlow — présentation pure (sur
 * le même principe que `Toast`) : tout l'état (messages, chargement,
 * erreur) vient du hook `useAssistant`, ce composant ne fait qu'un
 * champ de saisie local (`draft`) et le défilement automatique.
 */

const SUGGESTIONS = [
  "Que dois-je faire aujourd'hui ?",
  "Quels projets sont en retard ?",
  "Résume ma semaine.",
  "Quelles sont mes priorités ?",
];

export interface AssistantPanelProps {
  open: boolean;
  onClose: () => void;
  messages: AssistantChatMessage[];
  loading: boolean;
  error: string | null;
  onSend: (content: string) => void;
  onClear: () => void;
}

export function AssistantPanel({
  open,
  onClose,
  messages,
  loading,
  error,
  onSend,
  onClear,
}: AssistantPanelProps) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  if (!open) return null;

  function handleSubmit() {
    const value = draft.trim();
    if (!value || loading) return;
    onSend(value);
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div
      id="projectflow-assistant-panel"
      role="dialog"
      aria-modal="false"
      aria-label="Assistant ProjectFlow"
      className="fixed bottom-24 right-5 z-40 flex h-[32rem] max-h-[70vh] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl animate-scale-in sm:w-96"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquareIcon className="h-4.5 w-4.5 text-accent" />
          <h2 className="text-sm font-semibold text-fg">Assistant ProjectFlow</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClear}
            disabled={!hasMessages && !error}
            aria-label="Effacer la conversation"
            title="Effacer la conversation"
            className="rounded-md p-1.5 text-fg-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-fg disabled:opacity-40"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer l'assistant"
            className="rounded-md p-1.5 text-fg-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-fg"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {!hasMessages && !loading && (
          <div className="space-y-3">
            <p className="text-sm text-fg-muted">
              Bonjour 👋 Posez-moi une question sur vos projets, tâches ou réunions.
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onSend(suggestion)}
                  className="rounded-md border border-border bg-surface-muted px-3 py-2 text-left text-sm text-fg-muted transition-colors duration-150 hover:border-accent hover:text-fg"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
              message.role === "user"
                ? "ml-auto bg-accent text-accent-foreground"
                : "bg-surface-muted text-fg"
            )}
          >
            {message.content}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm text-fg-muted">
            <Spinner size="sm" />
            ProjectFlow réfléchit...
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-md border border-danger-600/30 bg-danger-50 px-3 py-2 text-sm text-danger-600 dark:bg-danger-100/10">
            {error}
          </p>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez votre message..."
            rows={1}
            className="min-h-[2.75rem] max-h-32 flex-1 resize-none"
          />
          <Button
            size="sm"
            icon={<SendIcon className="h-4 w-4" />}
            onClick={handleSubmit}
            disabled={loading || !draft.trim()}
          >
            Envoyer
          </Button>
        </div>
      </div>
    </div>
  );
}
