"use client";

import { useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PencilIcon, TrashIcon } from "@/components/ui/icons";
import { formatDate, formatTime } from "@/lib/format";
import { getInitials } from "@/lib/initials";
import { dangerGhostClasses } from "@/lib/utils";
import type { Comment } from "@/types/comment";

import { CommentEditor } from "./CommentEditor";

/**
 * Informations d'affichage de l'auteur d'un commentaire. Résolues une
 * seule fois par `CommentsSection` (via `getProfile()`,
 * services/profile.service.ts) et transmises en prop plutôt que
 * relues par chaque `CommentItem` — un seul utilisateur possible pour
 * l'instant (RLS `comments_select_own`, supabase/comments.sql), mais
 * cette interface prépare explicitement un futur mode multi-utilisateur
 * : il suffira de faire varier `author` par commentaire (résolu à
 * partir de `comment.userId`) sans changer la forme de ce composant.
 */
export interface CommentAuthor {
  displayName: string | null;
  email: string;
}

export interface CommentItemProps {
  comment: Comment;
  author: CommentAuthor;
  onUpdate: (id: string, content: string) => Promise<boolean>;
  onDeleteRequest: (comment: Comment) => void;
}

/**
 * CommentItem — une ligne de la liste des commentaires (Lot 17A) :
 * avatar, nom d'auteur, date, heure, badge "Modifié" (si
 * `editedAt` renseigné), contenu, actions Modifier/Supprimer.
 *
 * Édition inline : bascule sur `CommentEditor` pré-rempli avec le
 * contenu actuel, sans jamais recréer le commentaire (voir
 * `updateComment()`, services/comments.service.ts) — seule
 * `onUpdate` (fournie par `CommentsSection`) déclenche l'appel réseau ;
 * ce composant ne gère que l'état local d'édition/soumission.
 */
export function CommentItem({ comment, author, onUpdate, onDeleteRequest }: CommentItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [submitting, setSubmitting] = useState(false);

  const initials = getInitials(author.displayName, author.email);
  const authorLabel = author.displayName || author.email || "Utilisateur";
  const time = formatTime(comment.createdAt);

  function startEdit() {
    setDraft(comment.content);
    setEditing(true);
  }

  function cancelEdit() {
    if (submitting) return;
    setEditing(false);
  }

  async function submitEdit() {
    if (!draft.trim()) return;
    setSubmitting(true);
    const ok = await onUpdate(comment.id, draft.trim());
    setSubmitting(false);
    if (ok) setEditing(false);
  }

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start">
      <Avatar initials={initials} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-fg">{authorLabel}</span>
          <span className="text-xs text-fg-subtle">
            {formatDate(comment.createdAt)}
            {time ? ` · ${time}` : ""}
          </span>
          {comment.editedAt && <Badge tone="gray">Modifié</Badge>}
        </div>

        {editing ? (
          <div className="mt-2">
            <CommentEditor
              value={draft}
              onChange={setDraft}
              onSubmit={submitEdit}
              onCancel={cancelEdit}
              submitting={submitting}
              submitLabel="Enregistrer"
              autoFocus
            />
          </div>
        ) : (
          <>
            <p className="mt-1 whitespace-pre-wrap text-sm text-fg">{comment.content}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<PencilIcon className="h-3.5 w-3.5" />}
                onClick={startEdit}
                aria-label="Modifier le commentaire"
              >
                Modifier
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<TrashIcon className="h-3.5 w-3.5" />}
                onClick={() => onDeleteRequest(comment)}
                className={dangerGhostClasses}
                aria-label="Supprimer le commentaire"
              >
                Supprimer
              </Button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}
