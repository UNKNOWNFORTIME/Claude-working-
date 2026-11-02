"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NotebookPen, Pencil, Trash2 } from "lucide-react";
import { addNote, deleteNote, updateNote } from "@/server/actions/ideas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Markdown } from "@/components/shared/markdown";
import { TimeAgo } from "@/components/shared/item-link";
import { EmptyState } from "@/components/ui/misc";

type Note = { id: string; content: string; createdAt: Date; updatedAt: Date };

export function NotesPanel({ ideaId, notes }: { ideaId: string; notes: Note[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const res = await addNote(ideaId, draft);
      if (!res.ok) return void toast.error(res.error);
      setDraft("");
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-3">
        <Textarea
          autoGrow
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && draft.trim() && submit()}
          placeholder="Add a note — a finding, a conversation, a half-formed thought…"
          aria-label="New note"
          rows={3}
          className="border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={!draft.trim()} loading={pending}>Add note</Button>
        </div>
      </div>
      {notes.length === 0 ? (
        <EmptyState icon={NotebookPen} title="No notes yet">Notes are dated, so you can see how your thinking developed.</EmptyState>
      ) : (
        <ol className="relative space-y-5 border-l pl-5">
          {notes.map((n) => <NoteItem key={n.id} ideaId={ideaId} note={n} />)}
        </ol>
      )}
    </div>
  );
}

function NoteItem({ ideaId, note }: { ideaId: string; note: Note }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.content);
  const [, start] = useTransition();
  return (
    <li className="group relative">
      <span className="absolute -left-[25px] top-1.5 size-2 rounded-full border-2 border-background bg-muted-foreground/40" aria-hidden />
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <TimeAgo date={note.createdAt} />
        {note.updatedAt.getTime() - note.createdAt.getTime() > 60_000 && <span>· edited</span>}
        <span className="ml-auto flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button onClick={() => setEditing(true)} className="rounded p-1 hover:bg-muted hover:text-foreground" aria-label="Edit note"><Pencil className="size-3.5" /></button>
          <button
            onClick={() => start(async () => { const r = await deleteNote(ideaId, note.id); if (!r.ok) toast.error(r.error); router.refresh(); })}
            className="rounded p-1 hover:bg-muted hover:text-destructive" aria-label="Delete note"
          ><Trash2 className="size-3.5" /></button>
        </span>
      </div>
      {editing ? (
        <div className="space-y-2">
          <Textarea autoGrow autoFocus value={text} onChange={(e) => setText(e.target.value)} aria-label="Edit note" />
          <div className="flex justify-end gap-2">
            <Button size="xs" variant="ghost" onClick={() => { setText(note.content); setEditing(false); }}>Cancel</Button>
            <Button size="xs" onClick={() => start(async () => { const r = await updateNote(ideaId, note.id, text); if (!r.ok) return void toast.error(r.error); setEditing(false); router.refresh(); })}>Save</Button>
          </div>
        </div>
      ) : (
        <Markdown className="text-sm">{note.content}</Markdown>
      )}
    </li>
  );
}
