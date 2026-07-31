"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { SparklesIcon, TrashIcon } from "@/components/ui/icons";
import { generateTaskChecklist } from "@/services/ai.service";

export interface AiChecklistGeneratorProps {
  taskId: string;
  /** Insère les éléments sélectionnés dans la checklist réelle — reste
   *  à la charge de `ChecklistSection` (via son propre `create()` issu
   *  de `useChecklist`), pour que la liste affichée reste la seule
   *  source de vérité et se rafraîchisse normalement. Renvoie `false`
   *  sans fermer la modale si une insertion a échoué. */
  onInsert: (contents: string[]) => Promise<boolean>;
}

interface DraftItem {
  content: string;
  selected: boolean;
}

/**
 * AiChecklistGenerator — bouton "Générer avec l'IA" + aperçu
 * modifiable (Lot 19, action `generate_task_checklist`).
 *
 * Aucun appel IA au chargement : la génération ne démarre qu'au clic
 * explicite sur le bouton. L'aperçu (3 à 8 éléments) est entièrement
 * modifiable — contenu éditable, sélection/désélection, suppression de
 * l'aperçu — et rien n'est inséré dans la checklist réelle avant la
 * confirmation explicite ("Ajouter"). Fermer la modale abandonne
 * l'aperçu sans aucune trace.
 */
export function AiChecklistGenerator({ taskId, onInsert }: AiChecklistGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);

  async function handleGenerate() {
    if (loading) return;
    setError(null);
    setLoading(true);
    const { data, error: genError } = await generateTaskChecklist(taskId);
    setLoading(false);

    if (genError || !data) {
      setError(genError?.message ?? "La génération IA a échoué.");
      return;
    }

    setDrafts(data.items.map((item) => ({ content: item.content, selected: true })));
    setOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setOpen(false);
    setDrafts([]);
    setError(null);
  }

  function toggleSelected(index: number) {
    setDrafts((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  }

  function updateContent(index: number, content: string) {
    setDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, content } : item)));
  }

  function removeDraft(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleConfirm() {
    const selected = drafts
      .filter((item) => item.selected && item.content.trim().length > 0)
      .map((item) => item.content.trim());

    if (selected.length === 0) {
      setError("Sélectionnez au moins un élément à ajouter.");
      return;
    }

    setError(null);
    setSubmitting(true);
    const ok = await onInsert(selected);
    setSubmitting(false);

    if (ok) {
      setOpen(false);
      setDrafts([]);
    }
  }

  const selectedCount = drafts.filter((item) => item.selected).length;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        icon={<SparklesIcon className="h-3.5 w-3.5" />}
        onClick={handleGenerate}
        loading={loading}
      >
        Générer avec l&apos;IA
      </Button>

      <Modal
        open={open}
        onClose={closeModal}
        title="Aperçu de la checklist générée"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={handleConfirm} loading={submitting} disabled={selectedCount === 0}>
              {selectedCount > 0 ? `Ajouter (${selectedCount})` : "Ajouter"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-fg-muted">
            Décochez ou modifiez les éléments avant de les ajouter à la checklist. Rien
            n&apos;est enregistré tant que vous n&apos;avez pas confirmé.
          </p>

          {error && (
            <Toast variant="error" onClose={() => setError(null)}>
              {error}
            </Toast>
          )}

          {drafts.length === 0 ? (
            <p className="text-sm text-fg-subtle">Aucun élément à afficher.</p>
          ) : (
            <ul className="space-y-2">
              {drafts.map((item, index) => (
                <li key={index} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleSelected(index)}
                    disabled={submitting}
                    aria-label={
                      item.selected ? "Désélectionner l'élément" : "Sélectionner l'élément"
                    }
                    className="h-4 w-4 shrink-0 rounded border-border text-accent focus:ring-2 focus:ring-ring/20"
                  />
                  <Input
                    value={item.content}
                    onChange={(e) => updateContent(index, e.target.value)}
                    disabled={submitting}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeDraft(index)}
                    disabled={submitting}
                    aria-label="Retirer l'élément de l'aperçu"
                    className="shrink-0 rounded-md p-1.5 text-fg-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </>
  );
}
