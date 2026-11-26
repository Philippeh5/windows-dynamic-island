import { AnimatePresence, motion, type Transition } from "motion/react";
import type { ReactNode } from "react";
import type { Appearance } from "../../core/appearance";
import { cn } from "../../core/cn";
import type { Edge } from "../../core/placement";
import { GlassProbes } from "./GlassProbes";
import { cornerRadius, type Geo } from "./geometry";
import { glowStyle } from "./Rim";
import type { StatusLight } from "./statusLight";

/** The island's black body; its content blurs out and in whenever `contentKey` changes. */
export function Surface({
	g,
	big,
	look,
	transition,
	contentKey,
	rim,
	edge,
	upward,
	zoom,
	light,
	children,
}: {
	g: Geo;
	big: boolean;
	look: Appearance;
	transition: Transition;
	contentKey: string;
	rim: ReactNode;
	/** The edge a docked island hangs on. */
	edge: Edge;
	/** The island grows toward the top: its content stays put at the bottom. */
	upward: boolean;
	/** Scale of the open page (1 while closed). */
	zoom: number;
	/** Something to attend to: the island glows in its color. */
	light: StatusLight | undefined;
	children: ReactNode;
}) {
	const windows = look.style === "windows";
	return (
		<motion.div
			data-glass
			className={cn(
				"absolute inset-0 overflow-hidden bg-island shadow-[0_14px_34px_-14px_rgba(0,0,0,0.7)] transition-shadow duration-400 ease-[ease]",
				big && "shadow-[0_26px_60px_-18px_rgba(0,0,0,0.85),inset_0_-1px_0_rgba(255,255,255,0.06)]",
			)}
			style={
				light
					? { boxShadow: `0 0 22px 0 ${light.color}cc, 0 14px 34px -14px rgba(0, 0, 0, 0.7)` }
					: windows
						? glowStyle(look)
						: undefined
			}
			initial={false}
			animate={cornerRadius(g, windows, edge)}
			transition={transition}
		>
			<AnimatePresence mode="popLayout" initial={false}>
				<motion.div
					key={contentKey}
					className={cn("absolute left-1/2 -translate-x-1/2", upward ? "bottom-0 origin-bottom" : "top-0 origin-top")}
					style={{ width: g.width / zoom, height: g.height / zoom, zoom }}
					initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
					animate={{
						opacity: 1,
						scale: 1,
						filter: "blur(0px)",
						transition: { duration: 0.32, delay: 0.06, ease: [0.2, 0.9, 0.3, 1] },
					}}
					exit={{
						opacity: 0,
						scale: 0.94,
						filter: "blur(8px)",
						transition: { duration: 0.16, ease: "easeIn" },
					}}
				>
					{children}
				</motion.div>
			</AnimatePresence>
			{rim}
			{/* A blinking halo, drawn apart so the island itself never fades. */}
			{light?.blink && (
				<span
					className="pointer-events-none absolute inset-0 z-2 animate-status-blink rounded-[inherit]"
					style={{ boxShadow: `inset 0 0 0 2.5px ${light.color}, inset 0 0 16px ${light.color}` }}
				/>
			)}
			<GlassProbes />
		</motion.div>
	);
}
