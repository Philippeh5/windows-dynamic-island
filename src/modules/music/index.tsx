import { MusicIcon } from "lucide-react";
/**
 * Music module — Spotify and any other player exposed through the Windows
 * media controls (browsers, Apple Music, VLC…). Everything music-related lives
 * in this folder; its backend counterpart is `src-tauri/src/providers/music/`.
 */
import { useSetting } from "../../core/settings";
import type { IslandModule, ModuleView } from "../../core/types";
import { Artwork } from "./components/Artwork";
import { MiniPlayer } from "./components/MiniPlayer";
import { MusicCompactLeft, MusicCompactRight } from "./components/MusicCompact";
import { MusicPanel } from "./components/MusicPanel";
import { SpotifySettings } from "./components/SpotifySettings";
import { useAccentColor } from "./hooks/useAccentColor";
import { useMusic } from "./hooks/useMusic";
import { musicSettings } from "./settings";

export const musicModule: IslandModule = {
	id: "music",
	title: "music.title",
	settingsIcon: <MusicIcon size={15} />,
	settings: Object.values(musicSettings),
	SettingsSection: SpotifySettings,
	useView(): ModuleView {
		const { music, active } = useMusic();
		const accent = useAccentColor(music?.thumbnail);
		const autoExpand = useSetting(musicSettings.autoExpand);
		const showVisualizer = useSetting(musicSettings.visualizer);

		return {
			active,
			priority: music?.playing ? 50 : 10,
			icon: <Artwork src={music?.thumbnail} size={22} radius={11} />,
			// The island glows in the cover's color while it plays.
			accent,
			compact: music && {
				left: <MusicCompactLeft music={music} />,
				right: <MusicCompactRight music={music} accent={accent} showVisualizer={showVisualizer} />,
				width: 340,
			},
			peek: music && { node: <MiniPlayer music={music} />, width: 300 },
			expanded: <MusicPanel music={music} accent={accent} showVisualizer={showVisualizer} />,
			expandedSize: { width: 560, height: 176 },
			activityKey: autoExpand && music?.playing ? `${music.title}|${music.artist}` : undefined,
		};
	},
};
