"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { Toast } from "@/components/ui/Toast";
import { CopyIcon, RefreshIcon } from "@/components/ui/icons";

export interface AiSummarySection {
  label: string;
  value: string | string[];
}

export interface AiSummaryModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  loading: boolean;
  error: string | null;
  sections: AiSummarySection[];
  onRegenerate: () => void;
}

function sectionsToPlainText(title: string, sections: AiSummarySection[]): string {
  const lines = [title, ""];
  for (const section of sections) {
    lines.push(section.label);
    if (Array.isArray(section.value)) {
      if (section.value.length === 0) {
        lines.push("(aucun)");
      } else {
        for (const item of section.value) lines.push(`- ${item}`);
      }
    } else {
      lines.push(section.value || "(aucun)");
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

/**
 * AiSummaryModal — présentation commune aux résumés IA "Projet" et
 * "Réunion" (Lot 19, actions `summarize_project`/`summarize_meeting`).
 *
 * Résultat purement temporaire : rien n'est enregistré côté serveur,
 * aucune entrée Timeline générée. Fermer la modale ou régénérer perd
 * le résultat précédent — comportement volontaire (pas de mémoire, pas
 * de stockage automatique, voir consigne du Lot 19).
 */
export function AiSummaryModal({
  open,
  onClose,
  title,
  loading,
  error,
  sections,
  onRegenerate,
}: AiSummaryModalProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = sectionsToPlainText(title, sections);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible (permissions, contexte non
      // sécurisé…) : ignoré silencieusement, aucune action bloquante à
      // proposer ici.
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
          <Button
            variant="secondary"
            icon={<RefreshIcon className="h-3.5 w-3.5" />}
            onClick={onRegenerate}
            disabled={loading}
          >
            Régénérer
          </Button>
          <Button
            icon={<CopyIcon className="h-3.5 w-3.5" />}
            onClick={handleCopy}
            disabled={loading || !!error || sections.length === 0}
          >
            {copied ? "Copié !" : "Copier"}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-fg-muted">
          <Spinner size="sm" />
          Génération en cours…
        </div>
      ) : error ? (
        <Toast variant="error">{error}</Toast>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.label}>
              <h3 className="mb-1.5 text-sm font-semibold text-fg">{section.label}</h3>
              {Array.isArray(section.value) ? (
                section.value.length === 0 ? (
                  <p className="text-sm text-fg-subtle">Aucun élément.</p>
                ) : (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-fg-muted">
                    {section.value.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                )
              ) : (
                <p className="whitespace-pre-wrap text-sm text-fg-muted">{section.value}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
