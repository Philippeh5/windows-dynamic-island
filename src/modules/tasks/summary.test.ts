import { describe, expect, test } from "bun:test";
import { summary } from "./summary";

const lists = [
	{
		id: "a",
		title: "A",
		tasks: [
			{ id: "1", title: "Later", due: "2026-12-10" },
			{ id: "2", title: "Someday", due: null },
		],
	},
	{ id: "b", title: "B", tasks: [{ id: "3", title: "Late", due: "2026-11-20" }] },
];

describe("tasks summary", () => {
	test("counts open and due tasks, the earliest first", () => {
		expect(summary(lists, "2026-11-27")).toEqual({ open: 3, due: 1, next: lists[1].tasks[0] });
	});

	test("nothing to do", () => {
		const empty = summary([], "2026-11-27");
		expect([empty.open, empty.due, empty.next === undefined]).toEqual([0, 0, true]);
	});
});
