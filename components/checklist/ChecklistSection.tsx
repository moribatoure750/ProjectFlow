"use client";

import { useState } from "react";

import { Card } from "@/components/ui/Card";
import { Toast } from "@/components/ui/Toast";
import { useChecklist } from "@/hooks/useChecklist";
import type { ChecklistItem, ChecklistMoveDirection } from "@/types/checklist";

import { ChecklistComposer } from "./ChecklistComposer";
import { ChecklistItemList } from "./ChecklistItemList";
import { ChecklistProgress } from "./ChecklistProgress";
import { ChecklistSkeleton } from "./ChecklistSkeleton";
import { DeleteChecklistItemDialog } from "./DeleteChecklistItemDialog";

export interface ChecklistSectionProps {
  taskId: string;
}

/**
 * ChecklistSection — point d'entrée unique de la checklist d'une
 * tâche (Lot 18), intégré sous la description dans
 * `app/(app)/tasks/[id]/page.tsx`. Uniquement utilisé sur les tâches
 * (jamais projets/réunions) — cohérent avec `types/checklist.ts` et
 * `services/checklist.service.ts`, tous deux non-polymorphes.
 *
 * Regroupe : progression (`ChecklistProgress`), liste des éléments
 * (`ChecklistItemList`), champ d'ajout toujours visible
 * (`ChecklistComposer`) et confirmation de suppression
 * (`DeleteChecklistItemDialog`) — même esprit d'assemblage que
 * `CommentsSection`/`AttachmentSection`.
 */
export function ChecklistSection({ taskId }: ChecklistSectionProps) {
  const {
    items,
    loading,
    error,
    completedCount,
    totalCount,
    percent,
    create,
    update,
    toggle,
    remove,
    move,
  } = useChecklist(taskId);

  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ChecklistItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  async function handleCreate(content: string): Promise<boolean> {
    setActionError(null);
    const result = await create(content);
    if (!result.ok) setActionError(result.error);
    return result.ok;
  }

  async function handleUpdate(id: string, content: string): Promise<boolean> {
    setActionError(null);
    const result = await update(id, content);
    if (!result.ok) setActionError(result.error);
    return result.ok;
  }

  async function handleToggle(id: string, completed: boolean) {
    setActionError(null);
    const result = await toggle(id, completed);
    if (!result.ok) setActionError(result.error);
  }

  async function handleMove(id: string, direction: ChecklistMoveDirection) {
    setActionError(null);
    const result = await move(id, direction);
    if (!result.ok) setActionError(result.error);
  }

  function requestDelete(item: ChecklistItem) {
    setActionError(null);
    setPendingDelete(item);
  }

  function cancelDelete() {
    if (deleteSubmitting) return;
    setPendingDelete(null);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    setDeleteSubmitting(true);
    const result = await remove(pendingDelete.id);
    setDeleteSubmitting(false);

    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setPendingDelete(null);
  }

  return (
    <Card className="space-y-4 p-5">
      <h2 className="text-base font-semibold text-fg">Checklist</h2>

      {!loading && !error && (
        <ChecklistProgress
          completedCount={completedCount}
          totalCount={totalCount}
          percent={percent}
        />
      )}

      {actionError && (
        <Toast variant="error" onClose={() => setActionError(null)}>
          {actionError}
        </Toast>
      )}

      {loading ? (
        <ChecklistSkeleton />
      ) : error ? (
        <Toast variant="error">{error}</Toast>
      ) : (
        <ChecklistItemList
          items={items}
          onToggle={handleToggle}
          onUpdate={handleUpdate}
          onDeleteRequest={requestDelete}
          onMove={handleMove}
        />
      )}

      <ChecklistComposer onCreate={handleCreate} />

      <DeleteChecklistItemDialog
        item={pendingDelete}
        submitting={deleteSubmitting}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </Card>
  );
}
