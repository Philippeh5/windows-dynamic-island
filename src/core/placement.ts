/**
 * Where the island sits in its window (which covers the monitor's work area).
 *
 * - Docked (`dynamic` look): flush against one of the four edges, `along` px
 *   from that edge's middle.
 * - Free (`windows` look): the resting pill's center, as fractions of the
 *   window. It grows away from its tab bar (downward with the tabs on top), so
 *   the buttons stay put from one page to the next.
 *
 * Everything is clamped for the island's current size, so opening next to an
 * edge grows inward instead of off-screen.
 */
export const EDGES = ["top", "bottom", "left", "right"] as const;
export type Edge = (typeof EDGES)[number];

export type Placement = { kind: "dock"; edge: Edge; along: number } | { kind: "free"; x: number; y: number };

export interface Size {
	width: number;
	height: number;
}

/** Space the ears and bubbles take around the island. */
export interface Extras {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

/** Gap kept between a free or sliding island and the screen edges. */
export const EDGE_MARGIN = 12;
/** Half the resting pill: the free anchor is its center. */
export const REST_HALF = 19;
/** Releases this close to an edge's middle snap to it. */
const CENTER_SNAP = 28;

export const NO_EXTRAS: Extras = { left: 0, right: 0, top: 0, bottom: 0 };

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

export const isSide = (edge: Edge) => edge === "left" || edge === "right";

export const isEdge = (v: unknown): v is Edge => EDGES.includes(v as Edge);

const horizontal = (size: Size, stage: Size, extra: Extras, wanted: number) =>
	clamp(wanted, EDGE_MARGIN + extra.left, stage.width - size.width - EDGE_MARGIN - extra.right);

const vertical = (size: Size, stage: Size, extra: Extras, wanted: number) =>
	clamp(wanted, EDGE_MARGIN + extra.top, stage.height - size.height - EDGE_MARGIN - extra.bottom);

/** The island's top-left corner. */
export function place(
	p: Placement,
	size: Size,
	stage: Size,
	extra: Extras = NO_EXTRAS,
	upward = false,
): { x: number; y: number } {
	if (p.kind === "free") {
		const cx = p.x * stage.width;
		const cy = p.y * stage.height;
		const top = upward ? cy + REST_HALF - size.height : cy - REST_HALF;
		// 0 and 1 mean "against that wall", whatever the island's size.
		const low = stage.height - size.height - extra.bottom;
		return {
			x:
				p.x <= 0
					? extra.left
					: p.x >= 1
						? stage.width - size.width - extra.right
						: horizontal(size, stage, extra, cx - size.width / 2),
			y: p.y <= 0 ? extra.top : p.y >= 1 ? low : clamp(top, extra.top, low),
		};
	}
	if (isSide(p.edge)) {
		return {
			x: p.edge === "left" ? 0 : stage.width - size.width,
			y: vertical(size, stage, extra, stage.height / 2 + p.along - size.height / 2),
		};
	}
	return {
		x: horizontal(size, stage, extra, stage.width / 2 + p.along - size.width / 2),
		y: p.edge === "top" ? 0 : stage.height - size.height,
	};
}

/** Docks to the edge closest to the island's center, keeping its spot along it. */
export function dockAt(center: { x: number; y: number }, stage: Size): Placement {
	const distance: Record<Edge, number> = {
		top: center.y,
		bottom: stage.height - center.y,
		left: center.x,
		right: stage.width - center.x,
	};
	const edge = EDGES.reduce((best, e) => (distance[e] < distance[best] ? e : best), "top" as Edge);
	const along = isSide(edge) ? center.y - stage.height / 2 : center.x - stage.width / 2;
	return { kind: "dock", edge, along: Math.abs(along) < CENTER_SNAP ? 0 : Math.round(along) };
}

/** Left free where it was dropped; `top` is the resting pill's top-left corner. */
export function freeAt(center: { x: number; y: number }, stage: Size): Placement {
	const fraction = (v: number, size: number) => Math.round(clamp(v / Math.max(1, size), 0, 1) * 10000) / 10000;
	return { kind: "free", x: fraction(center.x, stage.width), y: fraction(center.y, stage.height) };
}

/** Let go this close to a screen edge, a free island sticks to it. */
const WALL_SNAP = 24;

/** Free look: dropped near a wall (or past it), the island ends up flush against it, like a Windows window. */
export function snapToWalls(p: Placement, box: Size & { left: number; top: number }, stage: Size): Placement {
	if (p.kind !== "free") return p;
	const near = (low: number, high: number, size: number, value: number) =>
		low <= WALL_SNAP ? 0 : high >= size - WALL_SNAP ? 1 : value;
	return {
		kind: "free",
		x: near(box.left, box.left + box.width, stage.width, p.x),
		y: near(box.top, box.top + box.height, stage.height, p.y),
	};
}

/** The spot a new install starts from: top middle, 8 px below the edge. */
export function defaultFree(stage: Size): Placement {
	return { kind: "free", x: 0.5, y: (8 + REST_HALF) / Math.max(1, stage.height) };
}
