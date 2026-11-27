/** Turns the post's data into what the island's pages already understand. */
import type { UsageLimit } from "../modules/ai-agents/common/types";
import type { CalEvent, CalendarState } from "../modules/clock/types";
import type { NotificationItem } from "../modules/notifications/types";
import type { PosteState } from "./poste";

const WINDOW_NAMES: Record<string, string> = { "5h": "5 h", wk: "Week" };

/** The post's limits for one agent (`claude`, `codex`, `antigravity`), if it has any. */
export function posteLimits(poste: PosteState | undefined, agent: string): UsageLimit[] {
	const quota = poste?.quotas?.find((q) => q.name.toLowerCase().includes(agent));
	return (quota?.windows ?? []).map((w) => {
		const resets = w.resetsAt ? Date.parse(w.resetsAt) : Number.NaN;
		return {
			id: `poste-${w.label}`,
			label: WINDOW_NAMES[w.label] ?? w.label,
			usedPct: w.used,
			// A date in the past (some providers send 1970) says nothing.
			resetsAt: resets > Date.now() ? resets : null,
		};
	});
}

const SOURCES: Record<string, string> = { poste: "Poste", workflow: "Workflow", agent: "Hermès" };

/** Announcements as notifications (negative ids: not Windows ones), newest first. */
export function posteNotifications(
	poste: PosteState | undefined,
	readAt: number,
	clearedAt: number,
): NotificationItem[] {
	return (poste?.announces ?? [])
		.map((a, i) => {
			const receivedAt = Date.parse(a.at) || 0;
			return {
				id: -(i + 1),
				app: SOURCES[a.source ?? ""] ?? "Poste",
				aumid: "",
				logo: null,
				title: a.text,
				body: null,
				receivedAt,
				read: receivedAt <= readAt,
			};
		})
		.filter((n) => n.receivedAt > clearedAt)
		.sort((a, b) => b.receivedAt - a.receivedAt);
}

export const POSTE_CALENDAR = "poste";
/** Events the post created for a reminder: it announces them itself. */
export const REMINDER_MARK = "⏰";

const time = (value: string, allDay: boolean) =>
	// "2026-12-01" alone would be read as UTC midnight.
	new Date(allDay ? `${value}T00:00` : value).getTime();

/** The island's calendar with the post's events added. */
export function withPosteEvents(calendar: CalendarState | undefined, poste: PosteState | undefined) {
	if (!poste?.configured || !poste.events) return calendar;
	const events: CalEvent[] = poste.events.map((e) => {
		const start = time(e.start, !!e.allDay);
		return {
			id: e.id,
			calendar: POSTE_CALENDAR,
			title: e.title,
			start,
			end: e.end ? time(e.end, !!e.allDay) : start + 30 * 60_000,
			allDay: !!e.allDay,
			location: null,
			meetingUrl: null,
			url: null,
			reminders: [],
		};
	});
	const base: CalendarState = calendar ?? {
		google: { builtinClient: false, hasClient: false, connected: false, account: null, error: null },
		feeds: [],
		calendars: [],
		events: [],
		range: null,
		loading: false,
		updatedAt: null,
	};
	return {
		...base,
		calendars: [
			...base.calendars,
			{
				key: POSTE_CALENDAR,
				name: "Google Calendar",
				color: "#4285F4",
				source: "google" as const,
				defaultVisible: true,
				visible: true,
				error: null,
			},
		],
		events: [...base.events, ...events].sort((a, b) => a.start - b.start),
	};
}
