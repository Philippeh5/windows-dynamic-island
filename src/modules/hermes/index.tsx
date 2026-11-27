/** Hermes, the user's assistant on the post: the same thread as on Telegram. */
import { BotIcon } from "lucide-react";
import { useProvider } from "../../core/bridge";
import { useT } from "../../core/i18n";
import { POSTE_PROVIDER, type PosteState } from "../../core/poste";
import type { IslandModule, ModuleView } from "../../core/types";
import { useCachedPage } from "../../core/usePostePage";
import { HermesPanel, type HermesThread } from "./HermesPanel";

const VIOLET = "#a78bfa";

export const hermesModule: IslandModule = {
	id: "hermes",
	title: "hermes.title",
	settingsIcon: <BotIcon size={14} />,
	useView(): ModuleView {
		const poste = useProvider<PosteState>(POSTE_PROVIDER);
		const thread = useCachedPage<HermesThread>("hermes");
		const t = useT();
		const last = thread?.messages.at(-1);

		return {
			active: false,
			priority: 0,
			accent: VIOLET,
			hidden: !poste?.configured,
			icon: <BotIcon size={14} color={VIOLET} />,
			summary: {
				left: (
					<span className="flex min-w-0 items-center gap-2 pl-1">
						<BotIcon size={14} color={VIOLET} />
						<span className="max-w-64 truncate text-[13px] font-semibold">{last?.text ?? t("hermes.title")}</span>
					</span>
				),
				right: thread?.busy ? (
					<span className="text-[12px] font-bold text-text-dim">{t("hermes.thinking")}</span>
				) : null,
				width: 360,
			},
			expanded: <HermesPanel />,
			expandedSize: { width: 580, height: 380 },
		};
	},
};
