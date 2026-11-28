import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../core/cn";
import { useT } from "../../core/i18n";
import type { ModuleEntry } from "../../core/types";
import { BUBBLE, BUBBLE_GAP } from "./geometry";
import { useBubblePeek } from "./peek";

export type Waiting = ModuleEntry & {
	/** The bubble's own key: the module's id, plus the thing's when it has several. */
	key: string;
	view: { alert: NonNullable<ModuleEntry["view"]["alert"]> & { label?: string } };
};

/** What is waiting for the user: one entry per bubble. */
export const waiting = (entries: ModuleEntry[]): Waiting[] =>
	entries.flatMap(({ module, view }) => {
		if (view.bubbles?.length) {
			return view.bubbles.map((b) => ({
				module,
				key: `${module.id}:${b.key}`,
				view: { ...view, alert: b, icon: b.icon },
			}));
		}
		return view.alert ? [{ module, key: module.id, view: { ...view, alert: view.alert } }] : [];
	});

/**
 * Things waiting (a question, a notification…) as ringed bubbles beside the
 * island, open or closed. Pointing at one opens only its card (`peek.tsx`);
 * clicking it opens its page.
 */
export function Satellites({
	entries,
	offset,
	upward,
	mirrored,
	onOpen,
}: {
	entries: Waiting[];
	/** Room taken between the bubbles and the island (the ambient bubbles). */
	offset: number;
	/** The island sits low: bubbles line up with its bottom. */
	upward: boolean;
	/** Docked on the left edge: the bubbles go on the right. */
	mirrored: boolean;
	onOpen: (moduleId: string) => void;
}) {
	return (
		<div
			className={cn(
				"pointer-events-none absolute flex gap-2",
				upward ? "bottom-0" : "top-0",
				!mirrored && "flex-row-reverse",
			)}
			style={
				mirrored
					? { left: `calc(100% + ${BUBBLE_GAP + offset}px)` }
					: { right: `calc(100% + ${BUBBLE_GAP + offset}px)` }
			}
		>
			<AnimatePresence>
				{entries.map((entry) => (
					<Satellite key={entry.key} entry={entry} onOpen={onOpen} />
				))}
			</AnimatePresence>
		</div>
	);
}

function Satellite({ entry: { module, key, view }, onOpen }: { entry: Waiting; onOpen: (moduleId: string) => void }) {
	const t = useT();
	const { close, ...peek } = useBubblePeek(key);
	return (
		<motion.button
			type="button"
			data-hit="bubble"
			data-no-drag
			className="pointer-events-auto grid flex-none place-items-center rounded-full bg-island"
			style={{
				width: BUBBLE,
				height: BUBBLE,
				boxShadow: `0 0 0 2px ${view.alert.color}, 0 0 14px ${view.alert.color}99`,
			}}
			initial={{ scale: 0.3, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			exit={{ scale: 0.3, opacity: 0 }}
			aria-label={view.alert.label ?? t(module.title)}
			{...peek}
			onClick={(e) => {
				e.stopPropagation();
				close();
				onOpen(module.id);
			}}
		>
			{view.icon}
		</motion.button>
	);
}
