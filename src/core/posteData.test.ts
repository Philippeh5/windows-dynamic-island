import { describe, expect, test } from "bun:test";
import type { PosteState } from "./poste";
import { posteLimits, posteNotifications, withPosteAgent, withPosteEvents } from "./posteData";

const poste: PosteState = {
	configured: true,
	connected: true,
	quotas: [{ name: "Claude", windows: [{ label: "5h", used: 44, resetsAt: "1970-01-01T00:00:00Z" }] }],
	announces: [
		{ id: "a", at: "2026-11-27T10:00:00Z", text: "Ancienne", source: "poste" },
		{ id: "b", at: "2026-11-27T11:00:00Z", text: "Nouvelle", source: "workflow" },
	],
	events: [{ id: "e", title: "Dentiste", start: "2026-12-01T10:00:00+01:00", end: null }],
	agendaError: null,
};

describe("poste data", () => {
	test("limits go to their agent, without a reset date in the past", () => {
		expect(posteLimits(poste, "claude")).toEqual([{ id: "poste-5h", label: "5 h", usedPct: 44, resetsAt: null }]);
		expect(posteLimits(poste, "codex")).toEqual([]);
	});

	test("announcements: newest first, read and cleared by date", () => {
		const read = Date.parse("2026-11-27T10:30:00Z");
		expect(posteNotifications(poste, read, 0).map((n) => [n.title, n.read])).toEqual([
			["Nouvelle", false],
			["Ancienne", true],
		]);
		expect(posteNotifications(poste, 0, read).map((n) => n.title)).toEqual(["Nouvelle"]);
	});

	test("events join the calendar", () => {
		const calendar = withPosteEvents(undefined, poste);
		expect(calendar?.events[0].title).toBe("Dentiste");
		expect(calendar?.calendars[0].key).toBe("poste");
	});

	test("tokens of the post add up with the local ones, day by day", () => {
		const tokens = { input: 1, output: 2, cacheRead: 3, cacheWrite: 4, messages: 1 };
		const day = (date: string, n: number) => ({ date, tokens: n, responses: 1 });
		const remote: PosteState = {
			...poste,
			quotas: [
				{
					name: "Claude",
					windows: [],
					tokensToday: tokens,
					usage: { daily: [day("2026-11-27", 5), day("2026-11-28", 10)], last5hTokens: 7 },
				},
			],
		};
		const snapshot = {
			available: false,
			sessions: [],
			limits: [{ id: "5h", label: "5h", usedPct: 1 }],
			tokensToday: tokens,
			usage: { daily: [day("2026-11-28", 1)], last5hTokens: 2 },
		};
		const card = withPosteAgent(snapshot, remote, "claude");
		expect(card.available).toBe(true);
		expect(card.limits).toEqual(snapshot.limits);
		expect(card.tokensToday).toEqual({ input: 2, output: 4, cacheRead: 6, cacheWrite: 8, messages: 2 });
		expect(card.usage).toEqual({
			daily: [day("2026-11-27", 5), { date: "2026-11-28", tokens: 11, responses: 2 }],
			last5hTokens: 9,
		});
		expect(withPosteAgent(snapshot, remote, "codex")).toBe(snapshot);
	});
});
