import { ArrowLeftIcon } from "lucide-react";
import { useState } from "react";
import { button, Confirm } from "../../components/ui/post";
import { Empty } from "../../components/ui/text";
import { cn } from "../../core/cn";
import { useLocale, useT } from "../../core/i18n";
import { usePosteAction, usePostePage } from "../../core/usePostePage";
import type { FlowEdge, FlowNode } from "./diagram";
import { Diagram } from "./FlowDiagram";

export interface Flows {
	workflows: {
		id: string;
		name: string;
		enabled: boolean;
		running: boolean;
		last: { status: string; at?: string | null; error?: string | null } | null;
	}[];
}

interface Flow {
	id: string;
	name: string;
	description: string;
	nodes: FlowNode[];
	edges: FlowEdge[];
}

export function WorkflowsPanel() {
	const [open, setOpen] = useState<string | null>(null);
	return (
		<div className="flex h-full min-h-0 flex-col gap-2" onClick={(e) => e.stopPropagation()}>
			{open ? <FlowPage key={open} id={open} onBack={() => setOpen(null)} /> : <FlowList onOpen={setOpen} />}
		</div>
	);
}

function FlowList({ onOpen }: { onOpen: (id: string) => void }) {
	const t = useT();
	const locale = useLocale();
	const { data, error, refresh } = usePostePage<Flows>("workflows", 10_000);
	const { busy, error: failed, run } = usePosteAction();
	if (!data) return <Empty>{error || t("workflows.loading")}</Empty>;
	const when = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
	const act = async (id: string, action: string, payload: Record<string, unknown>) => {
		if (await run(id, action, payload)) refresh();
	};

	return (
		<>
			{(failed || error) && <span className="truncate text-[11px] text-[#ff453a]">{failed || error}</span>}
			<ul className="flex min-h-0 flex-1 list-none flex-col gap-1 overflow-y-auto" data-scroll>
				{data.workflows.length === 0 && <Empty>{t("workflows.empty")}</Empty>}
				{data.workflows.map((w) => (
					<li key={w.id} className="flex flex-none items-center gap-1.5 rounded-xl bg-white/6 py-1 pr-1.5 pl-1">
						<button
							type="button"
							className="flex min-w-0 flex-1 flex-col items-start rounded-lg px-2 py-0.5 text-left hover:bg-white/8"
							onClick={() => onOpen(w.id)}
						>
							<span className="max-w-full truncate text-[12.5px] font-bold">{w.name}</span>
							<span
								className={cn(
									"max-w-full truncate text-[11px] text-text-faint",
									w.last?.status === "error" && "text-[#ff453a]",
								)}
							>
								{w.running
									? t("workflows.running")
									: w.last
										? `${t(w.last.status === "error" ? "workflows.failed" : "workflows.ok")}${w.last.at ? `, ${when.format(new Date(w.last.at))}` : ""}${w.last.error ? ` — ${w.last.error}` : ""}`
										: t("workflows.never")}
							</span>
						</button>
						<button
							type="button"
							className={cn(button, w.enabled && "bg-[#30d158]/30")}
							aria-pressed={w.enabled}
							disabled={!!busy}
							onClick={() => act(w.id, "toggleFlow", { id: w.id, enabled: !w.enabled })}
						>
							{t(w.enabled ? "workflows.on" : "workflows.off")}
						</button>
						<Confirm
							label={t("workflows.run")}
							confirm={t("workflows.confirm")}
							disabled={!!busy || w.running}
							onConfirm={() => act(w.id, "runFlow", { id: w.id })}
						/>
					</li>
				))}
			</ul>
		</>
	);
}

function FlowPage({ id, onBack }: { id: string; onBack: () => void }) {
	const t = useT();
	const { data, error } = usePostePage<Flow>("workflow", 60_000, id);
	return (
		<>
			<div className="flex items-center gap-2">
				<button type="button" className={cn(button, "px-2")} aria-label={t("workflows.back")} onClick={onBack}>
					<ArrowLeftIcon size={14} />
				</button>
				<span className="min-w-0 flex-1 truncate text-[13px] font-bold">{data?.name}</span>
			</div>
			{data ? (
				<>
					{data.description && <p className="line-clamp-2 text-[11.5px] text-text-dim">{data.description}</p>}
					<Diagram nodes={data.nodes} edges={data.edges} />
				</>
			) : (
				<Empty>{error || t("workflows.loading")}</Empty>
			)}
		</>
	);
}
