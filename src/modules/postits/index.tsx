/** The user's sticky notes, the same as in the post's Notes page. */
import { StickyNoteIcon } from "lucide-react";
import { useProvider } from "../../core/bridge";
import { useT } from "../../core/i18n";
import { POSTE_PROVIDER, type PosteState } from "../../core/poste";
import type { IslandModule, ModuleView } from "../../core/types";
import { useCachedPage } from "../../core/usePostePage";
import { noteLines } from "./checklist";
import { plain } from "./inline";
import { type Postits, PostitsPanel } from "./PostitsPanel";

const YELLOW = "#ffd60a";

export const postitsModule: IslandModule = {
	id: "postits",
	title: "postits.title",
	settingsIcon: <StickyNoteIcon size={14} />,
	useView(): ModuleView {
		const poste = useProvider<PosteState>(POSTE_PROVIDER);
		const page = useCachedPage<Postits>("postits");
		const t = useT();
		const todo = page?.postits.flatMap((n) => noteLines(n.text)).filter((l) => l.kind === "box" && !l.done) ?? [];

		return {
			active: false,
			priority: 0,
			accent: YELLOW,
			hidden: !poste?.configured,
			icon: <StickyNoteIcon size={14} color={YELLOW} />,
			summary: {
				left: (
					<span className="flex min-w-0 items-center gap-2 pl-1">
						<StickyNoteIcon size={14} color={YELLOW} />
						<span className="max-w-60 truncate text-[13px] font-semibold">
							{todo[0] ? plain(todo[0].text) : t("postits.title")}
						</span>
					</span>
				),
				right: todo.length ? (
					<span className="text-[12px] font-bold whitespace-nowrap text-text-dim">
						{t("postits.todo", { n: todo.length })}
					</span>
				) : null,
				width: 340,
			},
			expanded: <PostitsPanel />,
			expandedSize: { width: 720, height: 480 },
		};
	},
};
