import type { MusicState } from "../hooks/useMusic";
import { Artwork } from "./Artwork";
import { Controls } from "./Controls";

/** The player in small, under the music bubble. */
export function MiniPlayer({ music }: { music: MusicState }) {
	return (
		<div className="flex flex-col items-center gap-2.5">
			<div className="flex w-full min-w-0 items-center gap-3">
				<Artwork src={music.thumbnail} size={52} radius={12} />
				<div className="flex min-w-0 flex-col">
					<span className="truncate text-[13.5px] font-bold" title={music.title}>
						{music.title}
					</span>
					<span className="truncate text-[12px] text-text-dim">{music.artist || music.appName}</span>
				</div>
			</div>
			<Controls music={music} />
		</div>
	);
}
