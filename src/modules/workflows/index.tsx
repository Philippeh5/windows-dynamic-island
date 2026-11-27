/** The post's workflows: state, switch, run, and the diagram of each. */
import { WorkflowIcon } from "lucide-react";
import { useProvider } from "../../core/bridge";
import { useT } from "../../core/i18n";
import { POSTE_PROVIDER, type PosteState } from "../../core/poste";
import type { IslandModule, ModuleView } from "../../core/types";
import { useCachedPage } from "../../core/usePostePage";
import { type Flows, WorkflowsPanel } from "./WorkflowsPanel";

const CORAL = "#ff7a5c";

export const workflowsModule: IslandModule = {
	id: "workflows",
	title: "workflows.title",
	settingsIcon: <WorkflowIcon size={14} />,
	useView(): ModuleView {
		const poste = useProvider<PosteState>(POSTE_PROVIDER);
		const page = useCachedPage<Flows>("workflows");
		const t = useT();
		const on = page?.workflows.filter((w) => w.enabled).length ?? 0;
		const failing = page?.workflows.filter((w) => w.enabled && w.last?.status === "error").length ?? 0;

		return {
			active: false,
			priority: 0,
			accent: CORAL,
			hidden: !poste?.configured,
			icon: <WorkflowIcon size={14} color={CORAL} />,
			summary: page
				? {
						left: (
							<span className="flex items-center gap-2 pl-1 text-[13px] font-semibold whitespace-nowrap">
								<WorkflowIcon size={14} color={CORAL} />
								{t("workflows.enabledCount", { n: on })}
							</span>
						),
						right: failing ? (
							<span className="text-[12px] font-bold whitespace-nowrap text-[#ff453a]">
								{t("workflows.failingCount", { n: failing })}
							</span>
						) : null,
						width: 340,
					}
				: undefined,
			expanded: <WorkflowsPanel />,
			expandedSize: { width: 640, height: 350 },
		};
	},
};
