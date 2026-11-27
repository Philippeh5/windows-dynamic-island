import { motion } from "motion/react";
import { useEffect, useMemo } from "react";
import { useAppearance } from "../core/appearance";
import { useTauriEvent } from "../core/bridge";
import { cn } from "../core/cn";
import { useSyncLocale } from "../core/i18n";
import { type IslandApi, IslandContext } from "../core/island";
import { isSide } from "../core/placement";
import { setIslandControls } from "../core/plugins/host";
import { appearanceSettings, useSetting, zoomSetting } from "../core/settings";
import { useGlass } from "../core/useGlass";
import { useHitRects } from "../core/useHitRects";
import { useIslandController } from "../core/useIslandController";
import { useIslandDrag } from "../core/useIslandDrag";
import { modules } from "../modules";
import { requestAskFocus } from "../modules/ask/store";
import { requestFindFocus } from "../modules/find/store";
import { AmbientBubbles, SecondaryBubble } from "./island/Bubbles";
import { islandContent } from "./island/content";
import { GlassProbes } from "./island/GlassProbes";
import { ambientWidth, BUBBLE, BUBBLE_GAP, geometry, variantOf } from "./island/geometry";
import { launcherSize } from "./island/Launcher";
import { Rim } from "./island/Rim";
import { Satellites, waiting } from "./island/Satellites";
import { Surface } from "./island/Surface";
import { statusLight } from "./island/statusLight";
import { barWidthFor } from "./island/tabWindow";
import { useIslandFileDrop } from "./island/useIslandFileDrop";
import { PluginBackgrounds } from "./plugins/PluginBackgrounds";

export function Island() {
	const ctl = useIslandController(modules);
	const { mode, secondary, focused } = ctl;
	const saved = useAppearance();
	const light = statusLight(ctl.entries);
	const theme = useSetting(appearanceSettings.theme);
	useEffect(() => {
		document.documentElement.dataset.theme = theme;
		return () => {
			delete document.documentElement.dataset.theme;
		};
	}, [theme]);
	const look = light ? { ...saved, rim: [light.color, light.color], animate: false, glow: true } : saved;
	const windows = look.style === "windows";
	const v = variantOf(look);
	useHitRects();
	useGlass(look.glass, theme);
	useSyncLocale();
	useIslandFileDrop(ctl);

	const bigSize = ctl.launcher ? launcherSize(ctl.entries.length) : focused?.view.expandedSize;
	const big = mode === "expanded" || mode === "peek";
	const sized = geometry(v, look, mode, bigSize, ctl.shown);
	// Open, the island is wide enough for every tab (the 40 px are its padding).
	const shape =
		mode === "expanded"
			? { ...sized, width: Math.max(sized.width, barWidthFor(ctl.tabs.length, windows) + 40) }
			: sized;
	// The user's size, never larger than the screen.
	const wanted = useSetting(zoomSetting);
	const zoom = big
		? Math.max(0.5, Math.min(wanted, (window.innerWidth - 24) / shape.width, (window.innerHeight - 24) / shape.height))
		: 1;
	const g = { ...shape, width: shape.width * zoom, height: shape.height * zoom };
	const hidden = mode === "hidden";
	const swallowed = mode === "swallowed";
	const resting = mode === "compact" || mode === "idle";
	const showSecondary = mode === "compact" && secondary !== undefined;
	const transition = big ? v.expandSpring : v.shellSpring;

	const ambient = resting ? ambientWidth(ctl.entries.filter((e) => e.view.ambient).length) : 0;
	const second = showSecondary ? BUBBLE_GAP + BUBBLE : 0;
	const alerts = hidden || swallowed ? [] : waiting(ctl.entries);
	const alertWidth = ambientWidth(alerts.length);
	const drag = useIslandDrag({
		free: windows,
		growUp: windows && look.tabsPosition === "bottom",
		width: g.width,
		height: g.height,
		extras: (p) =>
			p.kind === "dock" && isSide(p.edge)
				? { left: 0, right: 0, top: ambient, bottom: second }
				: { left: g.ear + ambient + alertWidth, right: g.ear + second, top: 0, bottom: 0 },
		canReturn: !big,
		onDragChange: ctl.lockHover,
	});
	const edge = drag.placement.kind === "dock" ? drag.placement.edge : "top";
	const side = drag.placement.kind === "dock" && isSide(drag.placement.edge) ? (edge as "left" | "right") : undefined;
	// Concave ears only blend into the top or bottom edge, and not while it's off it.
	const ears = !windows && !side && !drag.dragging;
	// Where it slides to when hidden: out through its own edge.
	const away = {
		x: edge === "left" ? -g.width - 12 : edge === "right" ? g.width + 12 : 0,
		y: side ? 0 : drag.upward ? g.height + 12 : -g.height - 20,
	};

	// Global shortcut: the page opens (controller) and its input takes the keyboard.
	useTauriEvent("island://ask", requestAskFocus);
	useTauriEvent("island://find", requestFindFocus);

	const api: IslandApi = useMemo(
		() => ({ mode, tab: ctl.tab, expand: ctl.expand, collapse: ctl.collapse, keepOpen: ctl.keepOpen }),
		[mode, ctl.tab, ctl.expand, ctl.collapse, ctl.keepOpen],
	);

	// What plugins may ask of the island (`island.expand` / `collapse`).
	useEffect(() => {
		setIslandControls({ expand: ctl.expand, collapse: ctl.collapse });
		return () => setIslandControls(null);
	}, [ctl.expand, ctl.collapse]);

	// The tab bar sits on the side the island hangs from.
	const bar = windows ? v : { ...v, tabsAtBottom: edge === "bottom" };
	const content = islandContent(ctl, look, bar);
	const rim = windows ? <Rim look={look} /> : null;
	const bubble = { transition: v.shellSpring, rim, onOpen: ctl.expand, side };

	return (
		<IslandContext.Provider value={api}>
			<PluginBackgrounds />
			<div className="pointer-events-none fixed inset-0 overflow-hidden">
				{/* The island's spot on screen; the shell inside only deforms and resizes. */}
				<motion.div className="pointer-events-none absolute top-0 left-0" style={drag.position}>
					{/* The tray's black hole: the island spins into its own center and comes back out. */}
					<motion.div
						className="pointer-events-none relative flex origin-center justify-center"
						// Spinning away can't be followed by a rectangular cutout.
						{...(swallowed ? { "data-glass-off": true } : {})}
						initial={false}
						animate={swallowed ? { scale: 0, rotate: -200, opacity: 0 } : { scale: 1, rotate: 0, opacity: 1 }}
						transition={
							swallowed
								? { duration: 0.46, ease: [0.55, 0, 1, 0.45] }
								: { duration: 0.56, ease: [0.34, 1.4, 0.64, 1], opacity: { duration: 0.26 } }
						}
					>
						<motion.div
							className={cn(
								"pointer-events-auto relative touch-none will-change-[width,height,transform]",
								drag.dragging && "cursor-grabbing **:cursor-grabbing",
							)}
							{...(hidden || swallowed ? {} : { "data-hit": true })}
							{...ctl.domHover}
							style={drag.style}
							onPointerDown={drag.onPointerDown}
							onClickCapture={drag.onClickCapture}
							onUpdate={drag.onShellUpdate}
							onWheel={ctl.onWheel}
							initial={false}
							animate={{
								width: g.width,
								height: g.height,
								opacity: hidden ? 0 : 1,
								x: hidden ? away.x : 0,
								y: hidden ? away.y : 0,
							}}
							transition={transition}
							onClick={() => resting && ctl.expand()}
						>
							{/* Concave "ears" that blend the notch into the top edge of the screen. */}
							{ears && (
								<>
									<motion.span
										data-glass={drag.upward ? undefined : "earLeft"}
										className={cn(
											"pointer-events-none absolute right-full",
											drag.upward
												? "bottom-0 bg-[radial-gradient(circle_at_0_0,transparent_70%,var(--island)_71%)]"
												: "top-0 bg-[radial-gradient(circle_at_0_100%,transparent_70%,var(--island)_71%)]",
										)}
										initial={false}
										animate={{ width: g.ear, height: g.ear }}
										transition={v.shellSpring}
									>
										<GlassProbes />
									</motion.span>
									<motion.span
										data-glass={drag.upward ? undefined : "earRight"}
										className={cn(
											"pointer-events-none absolute left-full",
											drag.upward
												? "bottom-0 bg-[radial-gradient(circle_at_100%_0,transparent_70%,var(--island)_71%)]"
												: "top-0 bg-[radial-gradient(circle_at_100%_100%,transparent_70%,var(--island)_71%)]",
										)}
										initial={false}
										animate={{ width: g.ear, height: g.ear }}
										transition={v.shellSpring}
									>
										<GlassProbes />
									</motion.span>
								</>
							)}

							{/* Reached from a bubble, the island must still open on hover. */}
							<div className="absolute inset-0 rounded-[inherit]" onPointerEnter={ctl.enterIsland}>
								<Surface
									g={g}
									big={big}
									look={look}
									transition={transition}
									contentKey={content.key}
									rim={rim}
									edge={edge}
									upward={drag.upward}
									zoom={zoom}
									light={light}
								>
									{content.node}
								</Surface>
							</div>

							<Satellites
								entries={alerts}
								offset={resting ? ambient : 0}
								upward={drag.upward}
								mirrored={edge === "left"}
								onOpen={ctl.expand}
								onHover={ctl.hoverBubble}
							/>

							<AmbientBubbles
								entries={ctl.entries}
								visible={resting}
								shrunk={mode === "idle" && !windows}
								{...bubble}
							/>
							<SecondaryBubble entry={showSecondary ? secondary : undefined} {...bubble} />
						</motion.div>
					</motion.div>
				</motion.div>
			</div>
		</IslandContext.Provider>
	);
}
