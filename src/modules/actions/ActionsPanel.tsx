import { useState } from "react";
import { button, Confirm, field, Input } from "../../components/ui/post";
import { Empty, SectionLabel } from "../../components/ui/text";
import { cn } from "../../core/cn";
import { useT } from "../../core/i18n";
import type { PosteState } from "../../core/poste";
import { usePosteAction } from "../../core/usePostePage";

/** Quick actions on the post: its services, and a new task for the agents. */
export function ActionsPanel({ poste }: { poste: PosteState | undefined }) {
	const t = useT();
	const { busy, error, run } = usePosteAction();
	const [title, setTitle] = useState("");
	const [project, setProject] = useState("");
	const [start, setStart] = useState(false);
	const [note, setNote] = useState("");
	const services = poste?.services;
	const projects = poste?.projects ?? [];
	if (!services) return <Empty>{t("actions.loading")}</Empty>;
	const dir = project || projects[0]?.dir || "";

	const create = async () => {
		if (!title.trim() || !dir || busy) return;
		setNote("");
		if (await run("task", "newTask", { title: title.trim(), project: dir, start })) {
			setTitle("");
			setNote(t(start ? "actions.started" : "actions.created"));
		}
	};

	return (
		<div className="grid h-full min-h-0 grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
			<div className="flex min-h-0 flex-col gap-1">
				<SectionLabel>{t("actions.services")}</SectionLabel>
				<ul className="flex min-h-0 flex-1 list-none flex-col gap-0.5 overflow-y-auto" data-scroll>
					{services.map((s) => (
						<li key={s.id} className="flex h-8 flex-none items-center gap-2 px-1 text-[12px]">
							<span className={cn("size-1.75 flex-none rounded-full", s.running ? "bg-[#30d158]" : "bg-[#ff453a]")} />
							<span className="min-w-0 flex-1 truncate font-semibold" title={`${s.group} · ${s.warn ?? ""}`}>
								{s.name}
							</span>
							{s.restartable && (
								<Confirm
									label={t("actions.restart")}
									confirm={t("actions.confirm")}
									disabled={!!busy}
									onConfirm={() => run(s.id, "restart", { id: s.id })}
								/>
							)}
						</li>
					))}
				</ul>
			</div>
			<div className="flex min-h-0 flex-col gap-1.5">
				<SectionLabel>{t("actions.newTask")}</SectionLabel>
				<Input
					reason="task"
					value={title}
					maxLength={200}
					placeholder={t("actions.what")}
					aria-label={t("actions.what")}
					onChange={(e) => setTitle(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && create()}
				/>
				<select
					className={field}
					value={dir}
					aria-label={t("actions.project")}
					onChange={(e) => setProject(e.target.value)}
				>
					{projects.map((p) => (
						<option key={`${p.host}${p.dir}`} value={p.dir} className="bg-black">
							{p.name}
						</option>
					))}
				</select>
				<label className="flex items-center gap-1.5 text-[12px] text-text-dim">
					<input type="checkbox" checked={start} onChange={(e) => setStart(e.target.checked)} />
					{t("actions.start")}
				</label>
				<button type="button" className={button} disabled={!title.trim() || !dir || !!busy} onClick={create}>
					{t("actions.create")}
				</button>
				{(error || note) && (
					<span className={cn("text-[11px]", error ? "text-[#ff453a]" : "text-text-faint")}>{error || note}</span>
				)}
			</div>
		</div>
	);
}
