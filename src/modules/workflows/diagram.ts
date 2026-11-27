export interface FlowNode {
	id: string;
	type: string;
	x: number;
	y: number;
	hint: string;
}

export interface FlowEdge {
	from: string;
	to: string;
	label: string;
}

export const NODE_W = 170;
export const NODE_H = 52;
const PAD = 16;

/** Places the blocks as the post's editor has them, and draws each link from a block's right to the next one's left. */
export function layout(nodes: FlowNode[], edges: FlowEdge[]) {
	const minX = nodes.length ? Math.min(...nodes.map((n) => n.x)) : 0;
	const minY = nodes.length ? Math.min(...nodes.map((n) => n.y)) : 0;
	const placed = nodes.map((n) => ({ ...n, x: n.x - minX + PAD, y: n.y - minY + PAD }));
	const byId = new Map(placed.map((n) => [n.id, n]));
	const links = edges.flatMap((e) => {
		const a = byId.get(e.from);
		const b = byId.get(e.to);
		if (!a || !b) return [];
		const [x1, y1, x2, y2] = [a.x + NODE_W, a.y + NODE_H / 2, b.x, b.y + NODE_H / 2];
		const bend = Math.max(30, Math.abs(x2 - x1) / 2);
		return [
			{
				key: `${e.from}>${e.to}:${e.label}`,
				path: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`,
				label: e.label,
				x: (x1 + x2) / 2,
				y: (y1 + y2) / 2,
			},
		];
	});
	return {
		nodes: placed,
		links,
		width: Math.max(0, ...placed.map((n) => n.x + NODE_W)) + PAD,
		height: Math.max(0, ...placed.map((n) => n.y + NODE_H)) + PAD,
	};
}
