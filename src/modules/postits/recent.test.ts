import { describe, expect, test } from "bun:test";
import { currentChecklist, type Postit, RECENT_MS } from "./recent";

const note = (path: string, text: string, updated: number, epingle = false): Postit => ({
	path,
	text,
	updated,
	epingle,
	sujets: [],
});

describe("the checklist beside the island", () => {
	const now = RECENT_MS * 10;
	test("the latest one with something left", () => {
		const notes = [
			note("old", "- [ ] a", now - 2 * RECENT_MS),
			note("done", "- [x] a", now),
			note("plain", "hello", now),
			note("a", "- [ ] a", now - 2000),
			note("b", "- [x] a\n- [ ] b", now - 1000),
		];
		expect(currentChecklist(notes, now)?.path).toBe("b");
		expect(currentChecklist(notes, now, { b: now - 1000 })?.path).toBe("a");
	});
	test("a pinned note stays however old, a hidden one returns when it changes", () => {
		const pinned = note("p", "- [ ] a", 5, true);
		expect(currentChecklist([pinned], now)?.path).toBe("p");
		expect(currentChecklist([pinned], now, { p: 5 })).toBeNull();
		expect(currentChecklist([{ ...pinned, updated: 6 }], now, { p: 5 })?.path).toBe("p");
	});
});
