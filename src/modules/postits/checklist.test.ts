import { describe, expect, test } from "bun:test";
import { noteLines } from "./checklist";

describe("noteLines", () => {
	test("numbers the checkboxes, skipping code blocks", () => {
		const lines = noteLines("# Shop\n- [ ] one\n```\n- [ ] sample\n```\n\n- [x] two\nplain");
		expect(lines).toEqual([
			{ kind: "title", text: "Shop" },
			{ kind: "box", text: "one", done: false, index: 0 },
			{ kind: "text", text: "- [ ] sample" },
			{ kind: "box", text: "two", done: true, index: 1 },
			{ kind: "text", text: "plain" },
		]);
	});
});
