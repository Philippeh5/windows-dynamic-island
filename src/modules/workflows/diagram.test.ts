import { describe, expect, test } from "bun:test";
import { layout, NODE_H, NODE_W } from "./diagram";

const node = (id: string, x: number, y: number) => ({ id, x, y, type: "t", hint: "" });

describe("layout", () => {
	test("moves the drawing to the corner and links existing blocks only", () => {
		const d = layout(
			[node("a", -100, 40), node("b", 130, 40)],
			[
				{ from: "a", to: "b", label: "" },
				{ from: "a", to: "gone", label: "" },
			],
		);
		expect(d.nodes.map((n) => [n.x, n.y])).toEqual([
			[16, 16],
			[246, 16],
		]);
		expect(d.links).toHaveLength(1);
		expect(d.links[0].path.startsWith(`M ${16 + NODE_W} ${16 + NODE_H / 2} C`)).toBe(true);
		expect(d.width).toBe(246 + NODE_W + 16);
	});

	test("an empty workflow", () => {
		expect(layout([], []).nodes).toEqual([]);
	});
});
