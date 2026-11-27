import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { type FlowEdge, type FlowNode, layout, NODE_H, NODE_W } from "./diagram";

const FAMILY: Record<string, string> = {
	trigger: "#30d158",
	llm: "#a78bfa",
	telegram: "#64a8ff",
	flow: "#ff9f0a",
	obsidian: "#8b7bf7",
	http: "#45c4e6",
};

/** A workflow drawn as in the post's editor, read only. */
export function Diagram({ nodes, edges }: { nodes: FlowNode[]; edges: FlowEdge[] }) {
	const drawing = useMemo(() => layout(nodes, edges), [nodes, edges]);
	const box = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(0);
	useLayoutEffect(() => setWidth(box.current?.clientWidth ?? 0), []);
	// Fits the width, but stays readable: past that, it scrolls.
	const scale = width ? Math.min(1, Math.max(0.6, width / drawing.width)) : 1;

	return (
		<div ref={box} className="min-h-0 flex-1 overflow-auto rounded-2xl bg-white/4" data-scroll>
			<svg
				width={drawing.width * scale}
				height={drawing.height * scale}
				viewBox={`0 0 ${drawing.width} ${drawing.height}`}
				role="img"
				aria-label={nodes.map((n) => n.type).join(" → ")}
			>
				{drawing.links.map((link) => (
					<g key={link.key}>
						<path d={link.path} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={1.8} />
						{link.label && link.label !== "main" && (
							<text x={link.x} y={link.y - 4} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
								{link.label}
							</text>
						)}
					</g>
				))}
				{drawing.nodes.map((n) => {
					const [family, ...rest] = n.type.split(".");
					const color = FAMILY[family] ?? "#8e8e93";
					return (
						<g key={n.id} transform={`translate(${n.x} ${n.y})`}>
							<rect width={NODE_W} height={NODE_H} rx={12} fill={color} fillOpacity={0.16} stroke={color} />
							<text x={10} y={20} fontSize={12} fontWeight={700} fill="currentColor">
								{`${family} · ${rest.join(".")}`.slice(0, 25)}
							</text>
							<text x={10} y={38} fontSize={10.5} fill="currentColor" opacity={0.65}>
								{n.hint.length > 28 ? `${n.hint.slice(0, 27)}…` : n.hint}
							</text>
							<title>{`${n.type} ${n.hint}`}</title>
						</g>
					);
				})}
			</svg>
		</div>
	);
}
