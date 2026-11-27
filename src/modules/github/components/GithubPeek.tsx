import { providerAction } from "../../../core/bridge";
import { useT } from "../../../core/i18n";
import type { GithubNewItem, GithubRepo } from "../types";

/** What the GitHub bubble opens: what just arrived, else each repository's open counts. */
export function GithubPeek({ repos, news }: { repos: GithubRepo[]; news: GithubNewItem[] }) {
	const t = useT();
	return (
		<ul className="flex list-none flex-col gap-1">
			{news.slice(0, 4).map((n) => (
				<li key={`${n.kind}:${n.repo}:${n.item.id}`}>
					<button
						type="button"
						className="flex w-full min-w-0 flex-col items-start rounded-lg px-2 py-1 text-left hover:bg-white/8"
						onClick={() => providerAction("github", "open", { url: n.item.url })}
					>
						<span className="w-full truncate text-[12.5px] font-semibold">{n.item.title}</span>
						<span className="w-full truncate text-[11px] text-text-faint">{n.repo}</span>
					</button>
				</li>
			))}
			{news.length === 0 &&
				repos.slice(0, 5).map((r) => (
					<li key={r.name} className="flex items-center gap-2 px-2 py-0.5 text-[12px]">
						<span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
						<span className="flex-none text-[11px] text-text-faint">
							{t("github.tab.issues")} {r.issues?.count ?? "–"} · {t("github.tab.pulls")} {r.pulls?.count ?? "–"}
						</span>
					</li>
				))}
		</ul>
	);
}
