/** Quick actions on the post. */
import { ZapIcon } from "lucide-react";
import { useProvider } from "../../core/bridge";
import { useT } from "../../core/i18n";
import { POSTE_PROVIDER, type PosteState } from "../../core/poste";
import type { IslandModule, ModuleView } from "../../core/types";
import { ActionsPanel } from "./ActionsPanel";

const MINT = "#63e6be";

export const actionsModule: IslandModule = {
	id: "actions",
	title: "actions.title",
	settingsIcon: <ZapIcon size={14} />,
	useView(): ModuleView {
		const poste = useProvider<PosteState>(POSTE_PROVIDER);
		const t = useT();
		const down = poste?.services?.filter((s) => !s.running) ?? [];
		const total = poste?.services?.length ?? 0;

		return {
			active: false,
			priority: 0,
			accent: MINT,
			hidden: !poste?.configured,
			icon: <ZapIcon size={14} color={MINT} />,
			summary: total
				? {
						left: (
							<span className="flex items-center gap-2 pl-1 text-[13px] font-semibold whitespace-nowrap">
								<ZapIcon size={14} color={MINT} />
								{t("actions.running", { up: total - down.length, total })}
							</span>
						),
						right: down.length ? (
							<span className="max-w-40 truncate text-[12px] font-bold text-[#ff453a]">{down[0].name}</span>
						) : null,
						width: 340,
					}
				: undefined,
			expanded: <ActionsPanel poste={poste} />,
			expandedSize: { width: 600, height: 300 },
		};
	},
};
