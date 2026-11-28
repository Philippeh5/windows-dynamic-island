import { noteLines } from "./checklist";
import type { Postits } from "./PostitsPanel";

export type Postit = Postits["postits"][number];

/** A checklist stays beside the island this long after its last change (a pinned note: until done). */
export const RECENT_MS = 48 * 3600 * 1000;

/** The checklist to keep at hand: the latest one with something left to do. */
export function currentChecklist(notes: Postit[], now: number, dismissed: Record<string, number> = {}): Postit | null {
	const open = notes.filter(
		(n) =>
			noteLines(n.text).some((l) => l.kind === "box" && !l.done) &&
			(n.epingle || now - (n.updated ?? 0) < RECENT_MS) &&
			// Hidden by hand: back only once the note changes.
			dismissed[n.path] !== (n.updated ?? 0),
	);
	return open.sort((a, b) => (b.updated ?? 0) - (a.updated ?? 0))[0] ?? null;
}
