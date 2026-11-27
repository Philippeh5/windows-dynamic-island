import { describe, expect, test } from "bun:test";
import { defaultFree, dockAt, EDGE_MARGIN, freeAt, place, snapToWalls } from "./placement";

const stage = { width: 1920, height: 1040 };
const pill = { width: 265, height: 38 };
const open = { width: 720, height: 466 };

describe("docked", () => {
	test("each edge keeps the island flush against it", () => {
		expect(place({ kind: "dock", edge: "top", along: 0 }, pill, stage)).toEqual({ x: 827.5, y: 0 });
		expect(place({ kind: "dock", edge: "bottom", along: 0 }, open, stage).y).toBe(1040 - 466);
		expect(place({ kind: "dock", edge: "left", along: 0 }, pill, stage)).toEqual({ x: 0, y: 501 });
		expect(place({ kind: "dock", edge: "right", along: 0 }, open, stage).x).toBe(1920 - 720);
	});

	test("opening near a corner grows inward", () => {
		const corner = place({ kind: "dock", edge: "bottom", along: 900 }, open, stage);
		expect(corner.x).toBe(1920 - 720 - EDGE_MARGIN);
		const side = place({ kind: "dock", edge: "left", along: -900 }, open, stage);
		expect(side.y).toBe(EDGE_MARGIN);
	});

	test("a drop picks the closest edge", () => {
		expect(dockAt({ x: 960, y: 30 }, stage)).toEqual({ kind: "dock", edge: "top", along: 0 });
		expect(dockAt({ x: 300, y: 1000 }, stage)).toEqual({ kind: "dock", edge: "bottom", along: -660 });
		expect(dockAt({ x: 20, y: 200 }, stage)).toEqual({ kind: "dock", edge: "left", along: -320 });
		expect(dockAt({ x: 1900, y: 525 }, stage)).toEqual({ kind: "dock", edge: "right", along: 0 });
	});
});

describe("free", () => {
	test("stays where it was dropped", () => {
		const p = freeAt({ x: 700, y: 400 }, stage);
		const at = place(p, pill, stage);
		expect(Math.round(at.x + pill.width / 2)).toBe(700);
		expect(Math.round(at.y + pill.height / 2)).toBe(400);
	});

	test("tabs on top: the top edge stays put whatever the page's height", () => {
		const spot = freeAt({ x: 960, y: 200 }, stage);
		expect(Math.round(place(spot, open, stage).y)).toBe(181);
		expect(Math.round(place(spot, { width: 560, height: 190 }, stage).y)).toBe(181);
	});

	test("tabs at the bottom: the bottom edge stays put", () => {
		const spot = freeAt({ x: 960, y: 900 }, stage);
		const at = (height: number) => place(spot, { width: 560, height }, stage, undefined, true).y + height;
		expect(Math.round(at(466))).toBe(919);
		expect(Math.round(at(190))).toBe(919);
	});

	test("never leaves the screen", () => {
		const at = place(freeAt({ x: 5000, y: -50 }, stage), open, stage);
		expect(at.x).toBe(1920 - 720);
		expect(at.y).toBe(0);
	});

	test("near a wall it sticks to it, whatever the page's size", () => {
		const box = { left: 10, top: 1000, ...pill };
		const spot = snapToWalls(freeAt({ x: 142, y: 1019 }, stage), box, stage);
		expect(spot).toEqual({ kind: "free", x: 0, y: 1 });
		expect(place(spot, open, stage)).toEqual({ x: 0, y: 1040 - 466 });
		expect(place(spot, pill, stage)).toEqual({ x: 0, y: 1040 - 38 });
	});

	test("away from the walls nothing changes", () => {
		const spot = freeAt({ x: 700, y: 400 }, stage);
		expect(snapToWalls(spot, { left: 567, top: 381, ...pill }, stage)).toEqual(spot);
		const margin = freeAt({ x: 1920 - 200, y: 400 }, stage);
		expect(Math.round(place(margin, open, stage).x)).toBe(1920 - 720 - EDGE_MARGIN);
	});

	test("the default is the old spot at the top", () => {
		expect(Math.round(place(defaultFree(stage), pill, stage).y)).toBe(8);
	});
});
