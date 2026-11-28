/** Turns the post's data into what the island's pages already understand. */
import type { AgentSnapshot, UsageHistory, UsageLimit } from "../modules/ai-agents/common/types";
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

/**
 * One agent's card with what the post knows about it: its plan limits replace
 * the local ones, its tokens add up with those used on this computer.
 */
export function withPosteAgent(snapshot: AgentSnapshot, poste: PosteState | undefined, agent: string): AgentSnapshot {
	const limits = posteLimits(poste, agent);
	const quota = poste?.quotas?.find((q) => q.name.toLowerCase().includes(agent));
	const { tokensToday, usage } = quota ?? {};
	if (!limits.length && !tokensToday && !usage) return snapshot;
	const local = snapshot.tokensToday;
	return {
		...snapshot,
		available: true,
		limits: limits.length ? limits : snapshot.limits,
		tokensToday: tokensToday
			? {
					input: tokensToday.input + (local?.input ?? 0),
					output: tokensToday.output + (local?.output ?? 0),
					cacheRead: tokensToday.cacheRead + (local?.cacheRead ?? 0),
					cacheWrite: tokensToday.cacheWrite + (local?.cacheWrite ?? 0),
					messages: tokensToday.messages + (local?.messages ?? 0),
				}
			: local,
		usage: usage ? addUsage(usage, snapshot.usage) : snapshot.usage,
	};
}

/** Days are matched by date: the post's seven days are kept. */
function addUsage(remote: UsageHistory, local: UsageHistory | undefined): UsageHistory {
	return {
		daily: remote.daily.map((day) => {
			const here = local?.daily.find((d) => d.date === day.date);
			return {
				date: day.date,
				tokens: day.tokens + (here?.tokens ?? 0),
				responses: day.responses + (here?.responses ?? 0),
			};
		}),
		last5hTokens: remote.last5hTokens + (local?.last5hTokens ?? 0),
	};
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
