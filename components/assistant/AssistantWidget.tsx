"use client";

import { useRef, useState } from "react";

import { useAssistant } from "@/hooks/useAssistant";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { AssistantButton } from "./AssistantButton";
import { AssistantPanel } from "./AssistantPanel";

/**
 * Widget assistant ProjectFlow — monté une seule fois par
 * `components/layout/AppShell.tsx`, donc persistant à travers la
 * navigation entre pages (le layout `app/(app)/layout.tsx` n'est pas
 * remonté à chaque changement de route), sur le même principe que
 * `CommandPalette`.
 */
export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { messages, loading, error, send, clear } = useAssistant();

  function close() {
    setOpen(false);
  }

  useOnClickOutside(containerRef, open, close);

  return (
    <div ref={containerRef}>
      <AssistantButton open={open} onClick={() => setOpen((v) => !v)} />
      <AssistantPanel
        open={open}
        onClose={close}
        messages={messages}
        loading={loading}
        error={error}
        onSend={send}
        onClear={clear}
      />
    </div>
  );
}
