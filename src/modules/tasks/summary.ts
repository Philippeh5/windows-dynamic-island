import type { PosteTaskList } from "../../core/poste";

const pad = (n: number) => String(n).padStart(2, "0");
export const today = (at = new Date()) => `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;

/** How many tasks are open, how many are due (today or late), and the most pressing one. */
export function summary(lists: PosteTaskList[], day = today()) {
	const all = lists.flatMap((l) => l.tasks);
	const due = all.filter((t) => t.due && t.due <= day);
	const next =
		[...all].filter((t) => t.due).sort((a, b) => (a.due as string).localeCompare(b.due as string))[0] ?? all[0];
	return { open: all.length, due: due.length, next };
}
