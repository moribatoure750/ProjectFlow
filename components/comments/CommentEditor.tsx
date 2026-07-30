"use client";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

export interface CommentEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitting: boolean;
  submitLabel: string;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * CommentEditor — zone de saisie réutilisée à la fois pour publier un
 * nouveau commentaire (CommentsSection) et pour éditer un commentaire
 * existant (CommentItem, pré-rempli avec `value`). Purement
 * présentation : aucune logique métier ni appel réseau ici, tout est
 * délégué par l'appelant via `onSubmit`/`onCancel`.
 *
 * `onCancel` optionnel : absent lors de la publication d'un nouveau
 * commentaire depuis l'état vide (CommentsEmptyState), présent lors
 * d'une édition inline (on peut toujours annuler une modification en
 * cours, jamais annuler la simple présence du champ de composition).
 */
export function CommentEditor({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
  placeholder,
  autoFocus = false,
}: CommentEditorProps) {
  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? "Écrivez un commentaire…"}
        disabled={submitting}
        autoFocus={autoFocus}
        aria-label="Contenu du commentaire"
        className="min-h-[80px]"
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={submitting}
            aria-label="Annuler"
          >
            Annuler
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          onClick={onSubmit}
          loading={submitting}
          disabled={!value.trim()}
          aria-label={submitLabel}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
