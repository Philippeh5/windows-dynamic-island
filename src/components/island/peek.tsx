import { motion } from "motion/react";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import type { ModuleEntry } from "../../core/types";

/** The card closes this long after the pointer left the bubble and the card. */
const LEAVE_MS = 350;
const GAP = 8;
const MARGIN = 8;
/** Header and padding an open page has around its content. */
const PAGE_CHROME = 56;

interface Peek {
	show: (moduleId: string, bubble: HTMLElement) => void;
	leave: () => void;
	close: () => void;
}

const PeekContext = createContext<Peek>({ show: () => {}, leave: () => {}, close: () => {} });

/** What a bubble beside the island needs so that pointing at it opens only its own card. */
export function useBubblePeek(moduleId: string) {
	const peek = useContext(PeekContext);
	return {
		onPointerEnter: (e: React.PointerEvent<HTMLElement>) => peek.show(moduleId, e.currentTarget),
		onPointerLeave: peek.leave,
		close: peek.close,
	};
}

/** The card's content: what waits for the user, else the module's small view, else its page. */
function content({ view }: ModuleEntry): { node: ReactNode; width: number; height?: number; color?: string } {
	if (view.alert) return view.alert;
	if (view.peek) return view.peek;
	const { width, height } = view.expandedSize ?? { width: 480, height: 240 };
	return { node: view.expanded, width, height: Math.max(80, height - PAGE_CHROME) };
}

/**
 * One small island under (or over) the bubble pointed at. It stays while the
 * pointer is on the bubble or on it, or while typing in it.
 */
export function PeekProvider({
	entries,
	upward,
	side,
	onHover,
	children,
}: {
	entries: ModuleEntry[];
	/** The island sits low: cards open above the bubbles. */
	upward: boolean;
	/** Docked on a side edge: cards open beside the bubbles. */
	side?: "left" | "right";
	/** The pointer is on a bubble or its card: the island itself stays as it is. */
	onHover: (on: boolean) => void;
	children: ReactNode;
}) {
	const [shown, setShown] = useState<{ id: string; bubble: DOMRect; alert: boolean } | null>(null);
	const latest = useRef(entries);
	latest.current = entries;
	const [at, setAt] = useState({ left: 0, top: 0 });
	const timer = useRef<number | undefined>(undefined);
	const box = useRef<HTMLDivElement>(null);
	const hover = useRef(onHover);
	hover.current = onHover;

	const close = useCallback(() => {
		window.clearTimeout(timer.current);
		setShown(null);
		hover.current(false);
	}, []);
	const stay = useCallback(() => {
		window.clearTimeout(timer.current);
		hover.current(true);
	}, []);
	const leave = useCallback(() => {
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => {
			const active = document.activeElement;
			// Typing in the card: it stays, wherever the pointer goes.
			if (box.current?.contains(active) && active?.matches("input, textarea, select")) return;
			setShown(null);
			hover.current(false);
		}, LEAVE_MS);
	}, []);
	const show = useCallback(
		(id: string, bubble: HTMLElement) => {
			stay();
			const alert = !!latest.current.find((e) => e.module.id === id)?.view.alert;
			setShown({ id, alert, bubble: bubble.getBoundingClientRect() });
		},
		[stay],
	);

	const entry = shown && entries.find((e) => e.module.id === shown.id);
	// Its module went away, or what was waiting has been answered: nothing left to show.
	const gone = !!shown && (!entry || (shown.alert && !entry.view.alert));
	useEffect(() => {
		if (gone) close();
	}, [gone, close]);
	useEffect(() => () => window.clearTimeout(timer.current), []);

	// Beside the bubble, kept inside the window; measured again when its content changes.
	useLayoutEffect(() => {
		const el = box.current;
		if (!el || !shown) return;
		const place = () => {
			const { width, height } = el.getBoundingClientRect();
			const b = shown.bubble;
			let left = b.left + b.width / 2 - width / 2;
			let top = upward ? b.top - height : b.bottom;
			if (side) {
				left = side === "left" ? b.right : b.left - width;
				top = b.top + b.height / 2 - height / 2;
			}
			const fit = (v: number, size: number, room: number) =>
				Math.round(Math.max(MARGIN, Math.min(v, room - size - MARGIN)));
			setAt({ left: fit(left, width, window.innerWidth), top: fit(top, height, window.innerHeight) });
		};
		place();
		const watch = new ResizeObserver(place);
		watch.observe(el);
		return () => watch.disconnect();
	}, [shown, upward, side]);

	const api = useMemo(() => ({ show, leave, close }), [show, leave, close]);
	const card = entry && !gone ? content(entry) : undefined;

	return (
		<PeekContext.Provider value={api}>
			{children}
			{card &&
				createPortal(
					// The padding bridges the gap, so the pointer can travel from the bubble.
					<div
						key={shown?.id}
						ref={box}
						data-hit="bubble"
						data-no-drag
						className="fixed z-50"
						style={{
							...at,
							padding: side ? `0 ${GAP}px` : `${GAP}px 0`,
						}}
						onPointerEnter={stay}
						onPointerLeave={leave}
						onBlur={(e) => {
							// Done typing, elsewhere: it closes as after the pointer leaving.
							if (!e.currentTarget.contains(e.relatedTarget) && !e.currentTarget.matches(":hover")) close();
						}}
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
						onPointerDown={(e) => e.stopPropagation()}
						onWheel={(e) => e.stopPropagation()}
					>
						<motion.div
							className="overflow-auto rounded-[22px] bg-island p-3 text-text shadow-[0_18px_44px_-14px_rgba(0,0,0,0.8)] [scrollbar-width:none]"
							style={{
								width: Math.min(card.width, window.innerWidth - 2 * MARGIN),
								maxHeight: window.innerHeight - 80,
								boxShadow: card.color ? `inset 0 0 0 1.5px ${card.color}88` : undefined,
							}}
							initial={{ opacity: 0, scale: 0.92 }}
							animate={{ opacity: 1, scale: 1 }}
						>
							<div style={{ height: card.height }}>{card.node}</div>
						</motion.div>
					</div>,
					document.body,
				)}
		</PeekContext.Provider>
	);
}
