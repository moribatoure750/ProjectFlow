"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PaperclipIcon, SearchIcon } from "@/components/ui/icons";
import type { Attachment } from "@/types/attachment";

import { AttachmentItem } from "./AttachmentItem";

export interface AttachmentListProps {
  attachments: Attachment[];
  onPreview: (attachment: Attachment) => void;
  onDownload: (attachment: Attachment) => void;
  onDeleteRequest: (attachment: Attachment) => void;
}

type SortOption = "date_desc" | "date_asc" | "name_asc" | "name_desc" | "size_desc";

const SORT_LABELS: Record<SortOption, string> = {
  date_desc: "Plus récent",
  date_asc: "Plus ancien",
  name_asc: "Nom (A → Z)",
  name_desc: "Nom (Z → A)",
  size_desc: "Taille (plus lourd)",
};

function sortAttachments(attachments: Attachment[], sort: SortOption): Attachment[] {
  const sorted = [...attachments];
  switch (sort) {
    case "date_asc":
      return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case "name_asc":
      return sorted.sort((a, b) => a.fileName.localeCompare(b.fileName));
    case "name_desc":
      return sorted.sort((a, b) => b.fileName.localeCompare(a.fileName));
    case "size_desc":
      return sorted.sort((a, b) => b.sizeBytes - a.sizeBytes);
    case "date_desc":
    default:
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

/**
 * AttachmentList — liste des pièces jointes d'une entité (Lot 15,
 * enrichie en 15.5 : recherche par nom + tri). La liste passée en prop
 * reste triée par défaut côté service (plus récent d'abord) ; ce
 * composant n'altère jamais `attachments` lui-même, il en dérive une
 * vue filtrée/triée locale via `useMemo`.
 *
 * `EmptyState` distincte selon qu'il n'y a aucune pièce jointe du tout
 * ou que la recherche ne retourne aucun résultat, pour éviter le
 * message trompeur "Ajoutez votre premier document" alors que des
 * fichiers existent bel et bien.
 */
export function AttachmentList({
  attachments,
  onPreview,
  onDownload,
  onDeleteRequest,
}: AttachmentListProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("date_desc");

  const visibleAttachments = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    const filtered = trimmedQuery
      ? attachments.filter((attachment) =>
          attachment.fileName.toLowerCase().includes(trimmedQuery)
        )
      : attachments;
    return sortAttachments(filtered, sort);
  }, [attachments, query, sort]);

  if (attachments.length === 0) {
    return (
      <EmptyState
        compact
        icon={<PaperclipIcon className="h-6 w-6" />}
        title="Aucune pièce jointe"
        description="Ajoutez votre premier document."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          icon={<SearchIcon className="h-4 w-4" />}
          placeholder="Rechercher un fichier…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Rechercher une pièce jointe"
          className="sm:flex-1"
        />
        <Select
          value={sort}
          onChange={(event) => setSort(event.target.value as SortOption)}
          aria-label="Trier les pièces jointes"
          className="sm:w-48"
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {visibleAttachments.length === 0 ? (
        <EmptyState
          compact
          icon={<SearchIcon className="h-6 w-6" />}
          title="Aucun résultat"
          description="Aucune pièce jointe ne correspond à votre recherche."
        />
      ) : (
        <ul className="divide-y divide-border">
          {visibleAttachments.map((attachment) => (
            <AttachmentItem
              key={attachment.id}
              attachment={attachment}
              onPreview={() => onPreview(attachment)}
              onDownload={() => onDownload(attachment)}
              onDeleteRequest={() => onDeleteRequest(attachment)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
