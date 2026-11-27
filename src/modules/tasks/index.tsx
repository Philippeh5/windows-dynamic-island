/**
 * Google Tasks: the user's own to-do lists, read and written through the post
 * (not the agents' tasks). Backend: `src-tauri/src/providers/poste.rs`.
 */
import { ListChecksIcon } from "lucide-react";
import { useProvider } from "../../core/bridge";
import { useT } from "../../core/i18n";
import { POSTE_PROVIDER, type PosteState } from "../../core/poste";
import type { IslandModule, ModuleView } from "../../core/types";
import { summary } from "./summary";
import { TasksPanel } from "./TasksPanel";

const BLUE = "#4285F4";

export const tasksModule: IslandModule = {
	id: "google-tasks",
	title: "tasks.title",
	settingsIcon: <ListChecksIcon size={14} />,
	useView(): ModuleView {
		const poste = useProvider<PosteState>(POSTE_PROVIDER);
		const t = useT();
		const lists = poste?.taskLists;
		const { open, due, next } = summary(lists ?? []);

		return {
			active: false,
			priority: 0,
			accent: BLUE,
			hidden: !poste?.configured,
			icon: <ListChecksIcon size={14} color={BLUE} />,
			compact: lists
				? {
						left: (
							<span className="flex min-w-0 items-center gap-2 pl-1">
								<ListChecksIcon size={14} color={BLUE} />
								<span className="max-w-50 truncate text-[13px] font-semibold">{next?.title ?? t("tasks.empty")}</span>
							</span>
						),
						right: (
							<span className="text-[12px] font-bold whitespace-nowrap text-text-dim">
								{due ? t("tasks.dueCount", { n: due }) : t("tasks.openCount", { n: open })}
							</span>
						),
						width: 340,
					}
				: undefined,
			expanded: <TasksPanel lists={lists} error={poste?.tasksError} />,
			expandedSize: { width: 600, height: 420 },
		};
	},
};
