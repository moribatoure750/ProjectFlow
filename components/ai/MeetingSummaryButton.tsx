"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { SparklesIcon } from "@/components/ui/icons";
import { summarizeMeeting } from "@/services/ai.service";
import type { MeetingSummaryResult } from "@/types/ai";

import { AiSummaryModal, type AiSummarySection } from "./AiSummaryModal";

export interface MeetingSummaryButtonProps {
  meetingId: string;
}

function toSections(result: MeetingSummaryResult): AiSummarySection[] {
  return [
    { label: "Contexte", value: result.context },
    { label: "Résumé", value: result.summary },
    { label: "Décisions", value: result.decisions },
    { label: "Actions à effectuer", value: result.actions },
    { label: "Responsables", value: result.responsibles },
    { label: "Points à clarifier", value: result.openQuestions },
    { label: "Prochaine réunion conseillée", value: result.nextMeetingSuggestion },
  ];
}


/**
 * MeetingSummaryButton — bouton "Résumé IA" de la page de détail d'une
 * réunion (Lot 19, action `summarize_meeting`).
 *
 * Aucun appel IA au chargement de la page : la génération ne démarre
 * qu'au clic sur ce bouton. Résultat toujours temporaire (jamais
 * stocké, jamais journalisé) — voir `components/ai/AiSummaryModal.tsx`.
 */
export function MeetingSummaryButton({ meetingId }: MeetingSummaryButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<AiSummarySection[]>([]);

  async function generate() {
    setLoading(true);
    setError(null);
    const { data, error: genError } = await summarizeMeeting(meetingId);
    setLoading(false);

    if (genError || !data) {
      setError(genError?.message ?? "La génération du résumé a échoué.");
      return;
    }
    setSections(toSections(data));
  }

  function handleOpen() {
    if (loading) return;
    setOpen(true);
    generate();
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon={<SparklesIcon className="h-3.5 w-3.5" />}
        onClick={handleOpen}
        disabled={loading}
      >
        Résumé IA
      </Button>

      <AiSummaryModal
        open={open}
        onClose={() => setOpen(false)}
        title="Résumé intelligent de la réunion"
        loading={loading}
        error={error}
        sections={sections}
        onRegenerate={generate}
      />
    </>
  );
}
