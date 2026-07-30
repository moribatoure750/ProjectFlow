import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MessageSquareIcon } from "@/components/ui/icons";

export interface CommentsEmptyStateProps {
  onComposeRequest: () => void;
  /** Masque le bouton d'action lorsque le compositeur (CommentEditor)
   *  est déjà ouvert au-dessus de cette zone — évite un second
   *  déclencheur redondant (voir CommentsSection.tsx). */
  hideAction?: boolean;
}

/**
 * CommentsEmptyState — affiché quand une entité n'a encore aucun
 * commentaire. `MessageSquareIcon` (déjà utilisée comme icône de
 * l'onglet "Commentaires" dans les 3 pages de détail) plutôt qu'un
 * emoji littéral : reste cohérent avec le reste du Design System, où
 * chaque `EmptyState` utilise un SVG du même jeu d'icônes — même choix
 * qu'`ActivityEmptyState` (components/activity/ActivityEmptyState.tsx).
 */
export function CommentsEmptyState({ onComposeRequest, hideAction = false }: CommentsEmptyStateProps) {
  return (
    <EmptyState
      compact
      icon={<MessageSquareIcon className="h-6 w-6" />}
      title="Aucun commentaire"
      description="Commencez la discussion sur cet élément."
      action={
        hideAction ? undefined : (
          <Button
            type="button"
            size="sm"
            onClick={onComposeRequest}
            aria-label="Écrire un commentaire"
          >
            Écrire un commentaire
          </Button>
        )
      }
    />
  );
}
