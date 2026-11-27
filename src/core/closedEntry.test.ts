import { describe, expect, test } from "bun:test";
import { closedEntry } from "./closedEntry";
import type { ModuleEntry } from "./types";

const entry = (id: string, priority = 0) =>
	({ module: { id }, view: { priority, attention: priority > 80 } }) as ModuleEntry;
const monitor = entry("monitor");
const agents = entry("ai-agents", 90);
const notifications = entry("notifications", 30);
const all = [monitor, agents, notifications];

describe("closedEntry", () => {
	test("stays on the page looked at, even while something else is busy or waiting", () => {
		expect(closedEntry(all, agents, "monitor")).toBe(monitor);
	});

	test("news takes the place for its moment", () => {
		expect(closedEntry(all, agents, "monitor", "notifications")).toBe(notifications);
		expect(closedEntry(all, agents, "monitor", null)).toBe(monitor);
	});

	test("with no page yet, or one that is gone, the busiest", () => {
		expect(closedEntry(all, agents, null)).toBe(agents);
		expect(closedEntry(all, agents, "removed", "also-removed")).toBe(agents);
	});
});
