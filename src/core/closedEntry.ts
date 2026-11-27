import type { ModuleEntry } from "./types";

/**
 * The module the closed island sums up: news just arrived, for a few seconds;
 * otherwise the last page looked at, whatever else is going on (that goes to the
 * bubbles beside the island); before any page was opened, the busiest module.
 */
export function closedEntry(
	entries: ModuleEntry[],
	primary: ModuleEntry | undefined,
	lastTab: string | null,
	newsId: string | null = null,
) {
	const find = (id: string | null) => entries.find((e) => e.module.id === id);
	return find(newsId) ?? find(lastTab) ?? primary;
}
