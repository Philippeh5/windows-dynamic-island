import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../core/cn";
import { useT } from "../../core/i18n";
import type { ModuleEntry } from "../../core/types";
import { BUBBLE, BUBBLE_GAP } from "./geometry";

/** The card closes this long after the pointer left the bubble and the card. */
const LEAVE_MS = 350;

export type Waiting = ModuleEntry & { view: { alert: NonNullable<ModuleEntry["view"]["alert"]> } };

/** The modules with something waiting for the user. */
export const waiting = (entries: ModuleEntry[]) => entries.filter((e): e is Waiting => !!e.view.alert);

/**
 * Things waiting (a question, a notification…) as ringed bubbles beside the
 * island, open or closed. Pointing at one opens only its card, to answer or read
 * without opening the whole island; clicking it opens its page.
 */
export function Satellites({
	entries,
	offset,
	upward,
	mirrored,
	onOpen,
	onHover,
}: {
	entries: Waiting[];
	/** Room taken between the bubbles and the island (the ambient bubbles). */
	offset: number;
	/** The island sits low: cards open above the bubbles. */
	upward: boolean;
	/** Docked on the left edge: the bubbles go on the right. */
	mirrored: boolean;
	onOpen: (moduleId: string) => void;
	/** The pointer is on a bubble or its card: the island itself stays as it is. */
	onHover: (on: boolean) => void;
}) {
	const t = useT();
	const [open, setOpen] = useState<string | null>(null);
	const timer = useRef<number | undefined>(undefined);
	const card = useRef<HTMLDivElement>(null);
	const hover = useRef(onHover);
	hover.current = onHover;

	const enter = (id: string) => {
		window.clearTimeout(timer.current);
		setOpen(id);
		hover.current(true);
	};
	const leave = () => {
		window.clearTimeout(timer.current);
		// Typing in the card: it stays, wherever the pointer goes.
		if (card.current?.contains(document.activeElement) && document.activeElement?.tagName === "INPUT") return;
		// Told at once, so moving onto the island opens it; the card lingers a little.
		hover.current(false);
		timer.current = window.setTimeout(() => setOpen(null), LEAVE_MS);
	};
	// A card that went away while pointed at must not leave the island held.
	const gone = open !== null && !entries.some((e) => e.module.id === open);
	useEffect(() => {
		if (!gone) return;
		setOpen(null);
		hover.current(false);
	}, [gone]);
	useEffect(() => () => window.clearTimeout(timer.current), []);

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
				{entries.map(({ module, view }) => (
					// Hovering previews; the button inside is the control.
					<div
						key={module.id}
						className="pointer-events-auto relative"
						data-no-drag
						onPointerEnter={() => enter(module.id)}
						onPointerLeave={leave}
						onBlur={(e) => {
							// Done typing, elsewhere: the card closes like after a pointer leaving.
							const box = e.currentTarget;
							if (!box.contains(e.relatedTarget) && !box.matches(":hover")) setOpen(null);
						}}
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
					>
						<motion.button
							type="button"
							data-hit
							className="grid place-items-center rounded-full bg-island"
							style={{
								width: BUBBLE,
								height: BUBBLE,
								boxShadow: `0 0 0 2px ${view.alert.color}, 0 0 14px ${view.alert.color}99`,
							}}
							initial={{ scale: 0.3, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.3, opacity: 0 }}
							aria-label={t(module.title)}
							onClick={() => {
								setOpen(null);
								hover.current(false);
								onOpen(module.id);
							}}
						>
							{view.icon}
						</motion.button>
						{open === module.id && (
							// The padding bridges the gap, so the pointer can travel onto the card.
							<div
								ref={card}
								data-hit
								className={cn(
									"absolute z-10",
									upward ? "bottom-full pb-2" : "top-full pt-2",
									mirrored ? "right-0" : "left-0",
								)}
							>
								<motion.div
									className="overflow-hidden rounded-[22px] bg-black p-2.5 text-text shadow-[0_18px_44px_-14px_rgba(0,0,0,0.8)]"
									style={{ width: view.alert.width, boxShadow: `inset 0 0 0 1.5px ${view.alert.color}88` }}
									initial={{ opacity: 0, scale: 0.92 }}
									animate={{ opacity: 1, scale: 1 }}
								>
									{view.alert.node}
								</motion.div>
							</div>
						)}
					</div>
				))}
			</AnimatePresence>
		</div>
	);
}
