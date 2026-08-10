"use client";

import { useCallback, useState } from "react";

import { askAssistant } from "@/services/assistant.service";
import type { AssistantMessage } from "@/types/assistant";

/**
 * Assistant ProjectFlow — état de la conversation, uniquement côté
 * client (`useState`, jamais `localStorage`/base de données) : fermer
 * l'onglet ou recharger la page efface l'historique, sur le même
 * principe "toujours temporaire" que les résumés IA du Lot 19 (voir
 * `components/ai/AiSummaryModal.tsx`).
 *
 * L'historique est renvoyé à chaque requête (voir
 * `services/assistant.service.ts`) pour permettre à l'assistant de
 * tenir compte des échanges précédents, sans jamais être conservé côté
 * serveur.
 */

export interface AssistantChatMessage extends AssistantMessage {
  id: string;
}

let messageCounter = 0;
function nextMessageId(): string {
  messageCounter += 1;
  return `assistant-msg-${Date.now()}-${messageCounter}`;
}

export interface UseAssistantResult {
  messages: AssistantChatMessage[];
  loading: boolean;
  error: string | null;
  send: (content: string) => Promise<void>;
  clear: () => void;
}

export function useAssistant(): UseAssistantResult {
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || loading) return;

      // L'historique envoyé au serveur est celui d'avant ce nouveau
      // message (le serveur reçoit le nouveau message séparément, voir
      // services/assistant.service.ts#askAssistant).
      const history: AssistantMessage[] = messages.map(({ role, content: c }) => ({
        role,
        content: c,
      }));

      const userMessage: AssistantChatMessage = {
        id: nextMessageId(),
        role: "user",
        content: trimmed,
      };

      setMessages((prev) => [...prev, userMessage]);
      setError(null);
      setLoading(true);

      const { data, error: askError } = await askAssistant(trimmed, history);

      setLoading(false);

      if (askError || !data) {
        setError(askError?.message ?? "L'assistant n'a pas pu répondre.");
        return;
      }

      setMessages((prev) => [...prev, { id: nextMessageId(), role: "assistant", content: data }]);
    },
    [messages, loading]
  );

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, send, clear };
}
