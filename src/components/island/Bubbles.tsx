import { AnimatePresence, motion, type Transition } from "motion/react";
import type { ReactNode } from "react";
import { tv } from "tailwind-variants";
import { cn } from "../../core/cn";
import type { ModuleEntry } from "../../core/types";
import { GlassProbes } from "./GlassProbes";
import { useBubblePeek } from "./peek";

interface BubbleProps {
	transition: Transition;
	/** The rim drawn around each bubble (Windows Island style). */
	rim: ReactNode;
	onOpen: (moduleId: string) => void;
	/** On a side edge, bubbles stack above and below the island instead. */
	side?: "left" | "right";
}

/** Modules with an `ambient` glyph, as bubbles left of the resting island. */
export function AmbientBubbles({
	entries,
	visible,
	shrunk,
	...bubble
}: BubbleProps & { entries: ModuleEntry[]; visible: boolean; shrunk: boolean }) {
	return (
		<div
			className={cn(
				"pointer-events-none absolute flex gap-2",
				!bubble.side && "top-0 right-[calc(100%+10px)] flex-row-reverse",
				bubble.side && "bottom-[calc(100%+10px)] flex-col-reverse",
				bubble.side === "left" && "left-1.5",
				bubble.side === "right" && "right-1.5",
			)}
		>
			<AnimatePresence>
				{visible &&
					entries
						.filter((e) => e.view.ambient)
						.map(({ module, view }) => (
							<Bubble key={module.id} id={module.id} ambient from={40} scale={shrunk ? 0.84 : 1} layout {...bubble}>
								{view.ambient}
							</Bubble>
						))}
			</AnimatePresence>
		</div>
	);
}

/** The second busiest module, as a bubble right of the compact island. */
export function SecondaryBubble({ entry, ...bubble }: BubbleProps & { entry: ModuleEntry | undefined }) {
	return (
		<AnimatePresence>
			{entry && (
				<Bubble key={entry.module.id} id={entry.module.id} from={-40} {...bubble}>
					{entry.view.icon}
				</Bubble>
			)}
		</AnimatePresence>
	);
}

const bubble = tv({
	base: "absolute top-0 left-[calc(100%+10px)] grid size-9.5 place-items-center rounded-full bg-island shadow-[0_10px_24px_-12px_rgba(0,0,0,0.7)]",
	variants: {
		side: {
			left: "top-[calc(100%+10px)] left-1.5",
			right: "top-[calc(100%+10px)] right-1.5 left-auto",
		},
		ambient: { true: "pointer-events-auto relative top-auto right-auto left-auto flex-none origin-top" },
	},
});

function Bubble({
	id,
	ambient,
	from,
	scale = 1,
	layout,
	transition,
	rim,
	onOpen,
	side,
	children,
}: BubbleProps & {
	id: string;
	/** In the row of persistent bubbles, rather than placed right of the island. */
	ambient?: boolean;
	/** Horizontal offset it slides in from and out to. */
	from: number;
	scale?: number;
	layout?: boolean;
	children: ReactNode;
}) {
	const { close, ...peek } = useBubblePeek(id);
	return (
		<motion.button
			className={bubble({ side, ambient })}
			data-hit="bubble"
			data-no-drag
			{...peek}
			data-glass
			layout={layout}
			initial={{ opacity: 0, scale: 0.3, x: from }}
			animate={{ opacity: 1, scale, x: 0 }}
			exit={{ opacity: 0, scale: 0.3, x: from }}
			transition={transition}
			onClick={(e) => {
				e.stopPropagation();
				close();
				onOpen(id);
			}}
		>
			{children}
			{rim}
			<GlassProbes />
		</motion.button>
	);
}
