import { startOfDay } from "./events";
import type { CalEvent } from "./types";

/** How many events the list shows. */
const MOST = 60;

/** What is not over yet, grouped by day (an event under way counts for today). */
export function upcomingDays(events: CalEvent[], now: number) {
	const today = startOfDay(new Date(now)).getTime();
	const days = new Map<number, CalEvent[]>();
	const coming = events
		.filter((e) => e.end > now)
		.sort((a, b) => a.start - b.start)
		.slice(0, MOST);
	for (const event of coming) {
		const day = Math.max(today, startOfDay(new Date(event.start)).getTime());
		days.set(day, [...(days.get(day) ?? []), event]);
	}
	return [...days].sort(([a], [b]) => a - b).map(([day, list]) => ({ day, events: list }));
}
