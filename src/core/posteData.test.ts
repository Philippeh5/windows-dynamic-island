import { describe, expect, test } from "bun:test";
import type { PosteState } from "./poste";
import { posteLimits, posteNotifications, withPosteEvents } from "./posteData";

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
});
