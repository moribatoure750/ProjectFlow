import type { Comment } from "@/types/comment";

import type { CommentAuthor } from "./CommentItem";
import { CommentItem } from "./CommentItem";
import { CommentsEmptyState } from "./CommentsEmptyState";

export interface CommentListProps {
  comments: Comment[];
  author: CommentAuthor;
  /** Indique si le compositeur (CommentEditor) est déjà ouvert
   *  au-dessus de cette liste — transmis à `CommentsEmptyState` pour
   *  éviter un second bouton "Écrire un commentaire" redondant. */
  composerOpen: boolean;
  onUpdate: (id: string, content: string) => Promise<boolean>;
  onDeleteRequest: (comment: Comment) => void;
  onComposeRequest: () => void;
}

/**
 * CommentList — liste des commentaires d'une entité (Lot 17A), du
 * plus récent au plus ancien (ordre déjà appliqué côté service, voir
 * `getComments()`) — mêmes desktop (liste verticale) et mobile
 * (cartes compactes empilées) que `AttachmentList`/`ActivityList`,
 * sans logique de tri/recherche additionnelle dans ce lot.
 */
export function CommentList({
  comments,
  author,
  composerOpen,
  onUpdate,
  onDeleteRequest,
  onComposeRequest,
}: CommentListProps) {
  if (comments.length === 0) {
    return <CommentsEmptyState onComposeRequest={onComposeRequest} hideAction={composerOpen} />;
  }

  return (
    <ul className="divide-y divide-border">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          author={author}
          onUpdate={onUpdate}
          onDeleteRequest={onDeleteRequest}
        />
      ))}
    </ul>
  );
}
