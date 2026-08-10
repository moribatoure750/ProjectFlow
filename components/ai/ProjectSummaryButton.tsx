"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { SparklesIcon } from "@/components/ui/icons";
import { summarizeProject } from "@/services/ai.service";
import type { ProjectSummaryResult } from "@/types/ai";

import { AiSummaryModal, type AiSummarySection } from "./AiSummaryModal";

export interface ProjectSummaryButtonProps {
  projectId: string;
}

function toSections(result: ProjectSummaryResult): AiSummarySection[] {
  return [
    { label: "Résumé", value: result.summary },
    { label: "Progression", value: result.progress },
    { label: "Points positifs", value: result.strengths },
    { label: "Risques", value: result.risks },
    { label: "Recommandations", value: result.recommendations },
    { label: "Prochaines étapes", value: result.nextSteps },
    { label: "Conclusion", value: result.conclusion },
  ];
}


/**
 * ProjectSummaryButton — bouton "Résumé IA" de la page de détail d'un
 * projet (Lot 19, action `summarize_project`).
 *
 * Aucun appel IA au chargement de la page : la génération ne démarre
 * qu'au clic sur ce bouton. Résultat toujours temporaire (jamais
 * stocké, jamais journalisé) — voir `components/ai/AiSummaryModal.tsx`.
 */
export function ProjectSummaryButton({ projectId }: ProjectSummaryButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<AiSummarySection[]>([]);

  async function generate() {
    setLoading(true);
    setError(null);
    const { data, error: genError } = await summarizeProject(projectId);
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
        title="Résumé intelligent du projet"
        loading={loading}
        error={error}
        sections={sections}
        onRegenerate={generate}
      />
    </>
  );
}
