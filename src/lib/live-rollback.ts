// Snapshot + rollback helpers so destructive tests against the live app don't
// leave residue. Strategy: snapshot the user's tasks (the only table tests
// actually mutate today). After the test, delete anything created during the
// run and re-insert anything that was modified or removed.

import { supabase } from "@/integrations/supabase/client";

export interface TasksSnapshot {
  userId: string;
  takenAt: string;
  rows: Record<string, unknown>[];
}

export async function snapshotTasks(): Promise<TasksSnapshot | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("created_by", userId);
  if (error) {
    console.warn("snapshotTasks failed", error);
    return null;
  }
  return { userId, takenAt: new Date().toISOString(), rows: data ?? [] };
}

export interface RollbackResult {
  deleted: number;
  restored: number;
  errors: string[];
}

export async function rollbackTasks(snap: TasksSnapshot | null): Promise<RollbackResult> {
  const result: RollbackResult = { deleted: 0, restored: 0, errors: [] };
  if (!snap) return result;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId || userId !== snap.userId) {
    result.errors.push("auth context changed during run");
    return result;
  }

  const { data: current, error: readErr } = await supabase
    .from("tasks")
    .select("*")
    .eq("created_by", userId);
  if (readErr) {
    result.errors.push(`read: ${readErr.message}`);
    return result;
  }
  const currentRows = current ?? [];
  const snapById = new Map(snap.rows.map((r) => [String(r.id), r]));
  const currentById = new Map(currentRows.map((r) => [String(r.id), r]));

  // 1) delete any rows created during the run
  const created = currentRows.filter((r) => !snapById.has(String(r.id)));
  if (created.length > 0) {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .in(
        "id",
        created.map((r) => r.id as string),
      );
    if (error) result.errors.push(`delete: ${error.message}`);
    else result.deleted = created.length;
  }

  // 2) re-insert anything that was deleted during the run
  const removed = snap.rows.filter((r) => !currentById.has(String(r.id)));
  if (removed.length > 0) {
    // Strip generated-only fields would go here; the snapshot has the row as-is.
    const { error } = await supabase.from("tasks").insert(removed as never);
    if (error) result.errors.push(`restore-insert: ${error.message}`);
    else result.restored = removed.length;
  }

  // 3) restore mutated rows (status / priority / title / description / due_date)
  const mutated = snap.rows.filter((r) => {
    const c = currentById.get(String(r.id));
    if (!c) return false;
    return (
      c.status !== r.status ||
      c.priority !== r.priority ||
      c.title !== r.title ||
      c.description !== r.description ||
      c.due_date !== r.due_date
    );
  });
  for (const r of mutated) {
    const { error } = await supabase
      .from("tasks")
      .update({
        status: r.status as never,
        priority: r.priority as never,
        title: r.title as never,
        description: r.description as never,
        due_date: r.due_date as never,
      })
      .eq("id", r.id as string);
    if (error) result.errors.push(`restore-update: ${error.message}`);
    else result.restored += 1;
  }

  return result;
}
