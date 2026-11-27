import { describe, expect, test } from "bun:test";
import type { CalEvent } from "./types";
import { upcomingDays } from "./upcoming";

const at = (day: number, hour: number) => new Date(2026, 10, day, hour).getTime();
const event = (id: string, start: number, end: number) => ({ id, start, end }) as CalEvent;

describe("upcomingDays", () => {
	test("drops what is over, groups by day, keeps what is under way on today", () => {
		const days = upcomingDays(
			[
				event("later", at(29, 9), at(29, 10)),
				event("over", at(27, 8), at(27, 9)),
				event("trip", at(26, 8), at(28, 8)),
				event("soon", at(27, 15), at(27, 16)),
			],
			at(27, 12),
		);
		expect(days.map((d) => [new Date(d.day).getDate(), d.events.map((e) => e.id)])).toEqual([
			[27, ["trip", "soon"]],
			[29, ["later"]],
		]);
	});
});
