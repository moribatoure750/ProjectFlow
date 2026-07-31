"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ChevronDownIcon, PencilIcon, TrashIcon } from "@/components/ui/icons";
import { cn, dangerGhostClasses } from "@/lib/utils";
import type { ChecklistItem, ChecklistMoveDirection } from "@/types/checklist";

export interface ChecklistItemRowProps {
  item: ChecklistItem;
  isFirst: boolean;
  isLast: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onUpdate: (id: string, content: string) => Promise<boolean>;
  onDeleteRequest: (item: ChecklistItem) => void;
  onMove: (id: string, direction: ChecklistMoveDirection) => void;
}

/**
 * ChecklistItemRow — une ligne de la checklist (Lot 18) : case à
 * cocher, libellé (éditable en place), boutons Monter/Descendre,
 * Modifier et Supprimer.
 *
 * L'édition en place réutilise le même schéma que `CommentEditor` en
 * mode édition : bouton "Modifier" → `<Input>` + "Enregistrer"/
 * "Annuler", jamais de modale pour un simple changement de libellé.
 */
export function ChecklistItemRow({
  item,
  isFirst,
  isLast,
  onToggle,
  onUpdate,
  onDeleteRequest,
  onMove,
}: ChecklistItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.content);
  const [submitting, setSubmitting] = useState(false);

  function startEdit() {
    setDraft(item.content);
    setEditing(true);
  }

  function cancelEdit() {
    if (submitting) return;
    setEditing(false);
  }

  async function submitEdit() {
    if (!draft.trim()) return;
    setSubmitting(true);
    const ok = await onUpdate(item.id, draft.trim());
    setSubmitting(false);
    if (ok) setEditing(false);
  }

  return (
    <li className="flex items-start gap-3 py-2.5">
      <input
        type="checkbox"
        checked={item.completed}
        onChange={(event) => onToggle(item.id, event.target.checked)}
        aria-label={item.completed ? "Décocher l'élément" : "Cocher l'élément"}
        className="mt-1 h-4 w-4 shrink-0 rounded border-border text-accent focus:ring-2 focus:ring-ring/20"
      />

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitEdit();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelEdit();
                }
              }}
              disabled={submitting}
              autoFocus
              aria-label="Libellé de l'élément"
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={submitEdit}
              loading={submitting}
              disabled={!draft.trim()}
            >
              Enregistrer
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={cancelEdit}
              disabled={submitting}
            >
              Annuler
            </Button>
          </div>
        ) : (
          <p
            className={cn(
              "text-sm text-fg",
              item.completed && "text-fg-subtle line-through"
            )}
          >
            {item.content}
          </p>
        )}
      </div>

      {!editing && (
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onMove(item.id, "up")}
            disabled={isFirst}
            aria-label="Monter"
            className="rounded-md p-1.5 text-fg-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronDownIcon className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => onMove(item.id, "down")}
            disabled={isLast}
            aria-label="Descendre"
            className="rounded-md p-1.5 text-fg-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronDownIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={startEdit}
            aria-label="Modifier l'élément"
            className="rounded-md p-1.5 text-fg-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-fg"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteRequest(item)}
            aria-label="Supprimer l'élément"
            className={cn(
              "rounded-md p-1.5 transition-colors duration-150 hover:bg-surface-hover",
              dangerGhostClasses
            )}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </li>
  );
}
