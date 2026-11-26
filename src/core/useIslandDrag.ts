import { useMotionValue, useMotionValueEvent, useSpring, useTransform, useVelocity } from "motion/react";
import { type MouseEvent, type PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { command, useTauriEvent } from "./bridge";
import { defaultFree, dockAt, type Extras, freeAt, isEdge, type Placement, place, REST_HALF } from "./placement";
import {
	ISLAND_EDGE_KEY,
	ISLAND_FREE_KEY,
	ISLAND_OFFSET_KEY,
	positionSettings,
	readSetting,
	setSetting,
	useSettings,
	type Values,
} from "./settings";

/** Pixels the pointer must travel before a press becomes a drag (not a click). */
const DRAG_THRESHOLD = 5;
/** Seconds of release velocity added to where the island lands. */
const FLING = 0.1;

/** The island's glide: a bit of lag behind the pointer, bouncy on arrival. */
const follow = { stiffness: 480, damping: 30, mass: 0.85 };
/** Jelly settle of the squash & stretch. */
const wobble = { stiffness: 520, damping: 16, mass: 0.6 };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const stageSize = () =>
	typeof window === "undefined" ? { width: 0, height: 0 } : { width: window.innerWidth, height: window.innerHeight };

/** The saved spot: an edge for the docked look, anywhere for the free one. */
function storedPlacement(settings: Values, free: boolean): Placement {
	if (free) {
		const spot = settings[ISLAND_FREE_KEY] as { x?: unknown; y?: unknown } | undefined;
		return typeof spot?.x === "number" && typeof spot?.y === "number"
			? { kind: "free", x: spot.x, y: spot.y }
			: defaultFree(stageSize());
	}
	const edge = settings[ISLAND_EDGE_KEY];
	return { kind: "dock", edge: isEdge(edge) ? edge : "top", along: Number(settings[ISLAND_OFFSET_KEY]) || 0 };
}

const home = (free: boolean): Placement => (free ? defaultFree(stageSize()) : { kind: "dock", edge: "top", along: 0 });

function save(p: Placement) {
	if (p.kind === "free") {
		setSetting(ISLAND_FREE_KEY, { x: p.x, y: p.y });
		return;
	}
	setSetting(ISLAND_EDGE_KEY, p.edge);
	setSetting(ISLAND_OFFSET_KEY, p.along);
}

interface Options {
	/** Free placement (Windows Island look) rather than docked to an edge. */
	free: boolean;
	/** Free look with its tabs at the bottom: the island grows upward. */
	growUp: boolean;
	/** Target shell size (the live, animated one is tracked via `onShellUpdate`). */
	width: number;
	height: number;
	/** Space taken around the shell (ears, bubbles), for where it currently sits. */
	extras: (p: Placement) => Extras;
	/** False while the island is open: it only drifts back home once collapsed. */
	canReturn: boolean;
	onDragChange?: (dragging: boolean) => void;
}

/**
 * Dragging the island around the screen, with a squash & stretch deformation
 * driven by its speed. Returns motion values for the island's position and
 * shell style, the current placement, and the pointer handlers.
 *
 * What's rendered is `place(placement, live size)` plus a gliding offset that
 * springs back to zero, so any change of spot animates from where it was.
 */
export function useIslandDrag({ free, growUp, width, height, extras, canReturn, onDragChange }: Options) {
	const settings = useSettings();
	const returnToCenter = readSetting(settings, positionSettings.returnToCenter);
	const returnDelay = readSetting(settings, positionSettings.returnDelay);

	const [placement, setPlacement] = useState<Placement>(() => storedPlacement(settings, free));
	const current = useRef(placement);
	current.current = placement;
	const extrasRef = useRef(extras);
	extrasRef.current = extras;

	const liveWidth = useMotionValue(width);
	const liveHeight = useMotionValue(height);
	const stage = useMotionValue(stageSize());
	// Bumped when the placement or the extras change: the position is recomputed.
	const revision = useMotionValue(0);
	const signature = JSON.stringify([placement, extras(placement)]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: the signature is what must trigger the recompute
	useEffect(() => revision.set(revision.get() + 1), [signature, revision]);

	const offsetX = useMotionValue(0);
	const offsetY = useMotionValue(0);
	const glideX = useSpring(offsetX, follow);
	const glideY = useSpring(offsetY, follow);

	const base = useCallback(
		(p: Placement) =>
			place(p, { width: liveWidth.get(), height: liveHeight.get() }, stage.get(), extrasRef.current(p), growUp),
		[liveWidth, liveHeight, stage, growUp],
	);
	const x = useTransform(() => {
		revision.get();
		liveHeight.get();
		return base(current.current).x + glideX.get();
	});
	const y = useTransform(() => {
		revision.get();
		liveWidth.get();
		return base(current.current).y + glideY.get();
	});

	useEffect(() => {
		const onResize = () => stage.set(stageSize());
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [stage]);

	// --- squash & stretch ------------------------------------------------------
	// 1 while dragging / gliding, 0 at rest.
	const moving = useMotionValue(0);
	const speedX = useVelocity(glideX);
	const speedY = useVelocity(glideY);
	const stretch = useSpring(
		useTransform(() => moving.get() * Math.min(Math.hypot(speedX.get(), speedY.get()) / 5200, 0.16)),
		wobble,
	);
	// Hanging from the top edge, the bottom trails behind the movement (mirrored at the bottom).
	const skewSign =
		placement.kind === "dock" ? (placement.edge === "top" ? 1 : placement.edge === "bottom" ? -1 : 0) : 1;
	const skewX = useSpring(
		useTransform(() => skewSign * moving.get() * clamp(-speedX.get() / 190, -11, 11)),
		wobble,
	);
	const scaleX = useTransform(stretch, (s) => 1 + s);
	const scaleY = useTransform(stretch, (s) => 1 - s * 0.5);

	const dragging = useRef(false);
	const settle = () => {
		if (dragging.current || !moving.get()) return;
		if (Math.abs(glideX.get()) < 0.5 && Math.abs(glideY.get()) < 0.5) moving.set(0);
	};
	useMotionValueEvent(glideX, "change", settle);
	useMotionValueEvent(glideY, "change", settle);

	/** Switch to a new spot, gliding there from where the island is on screen. */
	const goTo = useCallback(
		(next: Placement) => {
			const shown = { x: x.get(), y: y.get() };
			current.current = next;
			setPlacement(next);
			const to = base(next);
			glideX.jump(shown.x - to.x);
			glideY.jump(shown.y - to.y);
			offsetX.jump(shown.x - to.x);
			offsetY.jump(shown.y - to.y);
			revision.set(revision.get() + 1);
			moving.set(1);
			offsetX.set(0);
			offsetY.set(0);
		},
		[x, y, base, glideX, glideY, offsetX, offsetY, revision, moving],
	);

	const recenter = useCallback(() => {
		const to = home(free);
		goTo(to);
		save(to);
	}, [free, goTo]);
	useTauriEvent("island://recenter", recenter);

	// Return home after a while (only once collapsed).
	const [isDragging, setIsDragging] = useState(false);
	const away = JSON.stringify(placement) !== JSON.stringify(home(free));
	useEffect(() => {
		if (!returnToCenter || !away || isDragging || !canReturn) return;
		const id = window.setTimeout(recenter, Math.max(0, returnDelay) * 1000);
		return () => window.clearTimeout(id);
	}, [returnToCenter, returnDelay, away, isDragging, canReturn, recenter]);

	// Follow the saved spot: on launch, a change of look, or the settings window.
	const saved = JSON.stringify(storedPlacement(settings, free));
	useEffect(() => {
		const next = JSON.parse(saved) as Placement;
		const now = current.current;
		// With "return to center" on, only a change of kind or edge moves the island.
		const sameSpot =
			now.kind === next.kind && (now.kind === "free" || (next.kind === "dock" && now.edge === next.edge));
		if (dragging.current || (returnToCenter && sameSpot) || JSON.stringify(now) === saved) return;
		goTo(next);
	}, [saved, returnToCenter, goTo]);

	// --- pointer -----------------------------------------------------------------
	const suppressClick = useRef(false);
	const onDragChangeRef = useRef(onDragChange);
	onDragChangeRef.current = onDragChange;

	const onPointerDown = useCallback(
		(e: PointerEvent<HTMLElement>) => {
			if (e.button !== 0) return;
			if ((e.target as Element).closest("input, textarea, select, [data-no-drag]")) return;

			const el = e.currentTarget;
			const pointerId = e.pointerId;
			const start = { x: e.clientX, y: e.clientY };
			let grab = { x: 0, y: 0 };
			let active = false;
			let last = { ...start };
			let lastT = performance.now();
			const speed = { x: 0, y: 0 };

			const move = (ev: globalThis.PointerEvent) => {
				if (ev.pointerId !== pointerId) return;
				// The release never came (the window lost the mouse while it was down,
				// e.g. a click that activated it): moving with the button up is no drag.
				if ((ev.buttons & 1) === 0) {
					end(ev);
					return;
				}
				if (!active) {
					if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < DRAG_THRESHOLD) return;
					active = true;
					dragging.current = true;
					moving.set(1);
					// Where on the island the pointer holds it.
					grab = { x: start.x - x.get(), y: start.y - y.get() };
					try {
						el.setPointerCapture(pointerId);
					} catch {
						/* pointer already gone */
					}
					setIsDragging(true);
					onDragChangeRef.current?.(true);
					command("set_dragging", { dragging: true });
				}
				const now = performance.now();
				const dt = Math.max(1, now - lastT);
				speed.x = speed.x * 0.6 + ((ev.clientX - last.x) / dt) * 1000 * 0.4;
				speed.y = speed.y * 0.6 + ((ev.clientY - last.y) / dt) * 1000 * 0.4;
				last = { x: ev.clientX, y: ev.clientY };
				lastT = now;
				const at = base(current.current);
				offsetX.set(ev.clientX - grab.x - at.x);
				offsetY.set(ev.clientY - grab.y - at.y);
			};

			const end = (ev: globalThis.PointerEvent) => {
				if (ev.pointerId !== pointerId) return;
				window.removeEventListener("pointermove", move);
				window.removeEventListener("pointerup", end);
				window.removeEventListener("pointercancel", end);
				if (!active) return;

				dragging.current = false;
				setIsDragging(false);
				onDragChangeRef.current?.(false);
				command("set_dragging", { dragging: false });
				try {
					el.releasePointerCapture(pointerId);
				} catch {
					/* already released */
				}
				// A pause before letting go cancels the fling.
				if (performance.now() - lastT > 80) speed.x = speed.y = 0;

				const size = { width: liveWidth.get(), height: liveHeight.get() };
				const left = last.x - grab.x + speed.x * FLING;
				const top = last.y - grab.y + speed.y * FLING;
				// Kept by the edge that holds the tabs, so they stay where they were dropped.
				let anchorY = growUp ? top + size.height - REST_HALF : top + REST_HALF;
				if (size.height <= REST_HALF * 3) anchorY = top + size.height / 2;
				const next = free
					? freeAt({ x: left + size.width / 2, y: anchorY }, stage.get())
					: dockAt({ x: last.x + speed.x * FLING, y: last.y + speed.y * FLING }, stage.get());
				goTo(next);
				save(next);

				// The click that follows pointerup must not expand / press buttons.
				suppressClick.current = true;
				window.setTimeout(() => (suppressClick.current = false), 0);
			};

			window.addEventListener("pointermove", move);
			window.addEventListener("pointerup", end);
			window.addEventListener("pointercancel", end);
		},
		[free, growUp, base, goTo, liveWidth, liveHeight, stage, moving, offsetX, offsetY, x, y],
	);

	const onClickCapture = useCallback((e: MouseEvent) => {
		if (!suppressClick.current) return;
		suppressClick.current = false;
		e.stopPropagation();
		e.preventDefault();
	}, []);

	/** Pass to the shell's `onUpdate` so clamping follows the animated size. */
	const onShellUpdate = useCallback(
		(latest: Record<string, unknown>) => {
			if (typeof latest.width === "number") liveWidth.set(latest.width);
			if (typeof latest.height === "number") liveHeight.set(latest.height);
		},
		[liveWidth, liveHeight],
	);

	const upward = placement.kind === "free" ? growUp : placement.edge === "bottom";

	return {
		placement,
		/** Grows toward the top (bottom edge, or low on the screen). */
		upward,
		position: { x, y },
		style: { scaleX, scaleY, skewX, transformOrigin: upward ? "50% 100%" : "50% 0" },
		dragging: isDragging,
		onPointerDown,
		onClickCapture,
		onShellUpdate,
	};
}
