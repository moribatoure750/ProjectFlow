import type { ComponentType, SVGProps } from "react";

import type { BadgeTone } from "@/components/ui/Badge";
import {
  CheckSquareIcon,
  MessageSquareIcon,
  PaperclipIcon,
  PencilIcon,
  PlusIcon,
  RefreshIcon,
  TrashIcon,
} from "@/components/ui/icons";

import type { Activity, ActivityAction } from "@/types/activity";

/**
 * Mapping action d'activité → présentation (libellé, couleur du Design
 * System, icône, description générique de repli), sur le même modèle
 * que `lib/badge-tones.ts` et `lib/notification-meta.ts`. Garde
 * `types/activity.ts` et `services/activity.service.ts` strictement
 * centrés sur les données, jamais sur l'UI.
 */
interface ActivityActionInfo {
  label: string;
  tone: BadgeTone;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Description affichée quand `metadata.description` n'est pas
   *  fourni par l'appelant (voir `getActivityDescription` ci-dessous).
   *  Le Lot 16B fournira des descriptions précises via `metadata`. */
  defaultDescription: string;
}

export function activityActionInfo(action: ActivityAction): ActivityActionInfo {
  switch (action) {
    case "created":
      return {
        label: "Créé",
        tone: "green",
        icon: PlusIcon,
        defaultDescription: "Cet élément a été créé.",
      };
    case "updated":
      return {
        label: "Modifié",
        tone: "blue",
        icon: PencilIcon,
        defaultDescription: "Cet élément a été modifié.",
      };
    case "deleted":
      return {
        label: "Supprimé",
        tone: "red",
        icon: TrashIcon,
        defaultDescription: "Cet élément a été supprimé.",
      };
    case "status_changed":
      return {
        label: "Statut changé",
        tone: "orange",
        icon: RefreshIcon,
        defaultDescription: "Le statut a été mis à jour.",
      };
    case "comment_added":
    case "comment_created":
      return {
        label: "Commentaire",
        tone: "purple",
        icon: MessageSquareIcon,
        defaultDescription: "Un commentaire a été ajouté.",
      };
    case "comment_updated":
      return {
        label: "Commentaire modifié",
        tone: "purple",
        icon: MessageSquareIcon,
        defaultDescription: "Un commentaire a été modifié.",
      };
    case "comment_deleted":
      return {
        label: "Commentaire supprimé",
        tone: "gray",
        icon: MessageSquareIcon,
        defaultDescription: "Un commentaire a été supprimé.",
      };
    case "attachment_added":
      return {
        label: "Pièce jointe ajoutée",
        tone: "blue",
        icon: PaperclipIcon,
        defaultDescription: "Une pièce jointe a été ajoutée.",
      };
    case "attachment_removed":
      return {
        label: "Pièce jointe supprimée",
        tone: "gray",
        icon: PaperclipIcon,
        defaultDescription: "Une pièce jointe a été supprimée.",
      };
    case "checklist_item_created":
      return {
        label: "Élément ajouté",
        tone: "green",
        icon: CheckSquareIcon,
        defaultDescription: "Un élément a été ajouté à la checklist.",
      };
    case "checklist_item_completed":
      return {
        label: "Élément coché",
        tone: "green",
        icon: CheckSquareIcon,
        defaultDescription: "Un élément de la checklist a été coché.",
      };
    case "checklist_item_uncompleted":
      return {
        label: "Élément décoché",
        tone: "gray",
        icon: CheckSquareIcon,
        defaultDescription: "Un élément de la checklist a été décoché.",
      };
    case "checklist_item_updated":
      return {
        label: "Élément modifié",
        tone: "blue",
        icon: CheckSquareIcon,
        defaultDescription: "Un élément de la checklist a été modifié.",
      };
    case "checklist_item_deleted":
      return {
        label: "Élément supprimé",
        tone: "red",
        icon: CheckSquareIcon,
        defaultDescription: "Un élément a été supprimé de la checklist.",
      };
    default:

      return {
        label: action,
        tone: "gray",
        icon: PencilIcon,
        defaultDescription: "Une action a été effectuée.",
      };
  }
}

/**
 * Dérive la description affichable d'une activité : utilise
 * `metadata.description` si l'appelant l'a fourni (chaîne non vide),
 * sinon retombe sur la description générique de l'action
 * (`defaultDescription`). Aucune autre clé de `metadata` n'est
 * interprétée dans ce lot — le Lot 16B pourra enrichir cette fonction
 * si des descriptions plus structurées sont nécessaires.
 */
export function getActivityDescription(activity: Activity): string {
  const rawDescription = activity.metadata?.description;
  if (typeof rawDescription === "string" && rawDescription.trim().length > 0) {
    return rawDescription;
  }
  return activityActionInfo(activity.action).defaultDescription;
}
