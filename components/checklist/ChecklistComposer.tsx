"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PlusIcon } from "@/components/ui/icons";

export interface ChecklistComposerProps {
  onCreate: (content: string) => Promise<boolean>;
}

/**
 * ChecklistComposer — champ d'ajout rapide, toujours visible en bas de
 * la checklist (Lot 18), plutôt qu'un compositeur ouvert/fermé comme
 * `CommentsSection` : ajouter un élément est l'action la plus
 * fréquente d'une checklist, elle ne doit jamais nécessiter un clic
 * supplémentaire pour "ouvrir" un formulaire.
 *
 * Soumission au clic sur "Ajouter" ou à la touche Entrée. Le champ est
 * vidé après un ajout réussi (le composant reste monté, prêt pour le
 * suivant) ; il n'est PAS vidé en cas d'échec, pour ne jamais faire
 * perdre la saisie de l'utilisateur.
 */
export function ChecklistComposer({ onCreate }: ChecklistComposerProps) {
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!draft.trim() || submitting) return;
    setSubmitting(true);
    const ok = await onCreate(draft.trim());
    setSubmitting(false);
    if (ok) setDraft("");
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Ajouter un élément…"
        disabled={submitting}
        aria-label="Nouvel élément de la checklist"
        className="flex-1"
      />
      <Button
        type="button"
        size="sm"
        icon={<PlusIcon className="h-3.5 w-3.5" />}
        onClick={handleSubmit}
        loading={submitting}
        disabled={!draft.trim()}
      >
        Ajouter
      </Button>
    </div>
  );
}
