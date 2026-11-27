import { useState } from "react";
import { button, field } from "../../../../components/ui/post";
import { cn } from "../../../../core/cn";
import { useT } from "../../../../core/i18n";
import type { PosteState } from "../../../../core/poste";
import { setSetting, useSetting } from "../../../../core/settings";
import { usePosteAction } from "../../../../core/usePostePage";
import { newSessionSettings } from "../../settings";

/** Starts an agent in one of the post's projects: pick both, press the button. */
export function NewSession({ poste, onDone }: { poste: PosteState; onDone: () => void }) {
	const t = useT();
	const { busy, error, run } = usePosteAction();
	const lastProject = useSetting(newSessionSettings.project);
	const lastTool = useSetting(newSessionSettings.tool);
	const [started, setStarted] = useState(false);
	const projects = poste.projects ?? [];
	const providers = poste.providers ?? [];
	// The last choice, as long as the post still offers it.
	const project = projects.find((p) => p.dir === lastProject) ?? projects[0];
	const tool = providers.find((p) => p.id === lastTool) ?? providers[0];

	const launch = async () => {
		if (!project || !tool || busy) return;
		if (!(await run("launch", "launch", { project: project.dir, tool: tool.id }))) return;
		setStarted(true);
		window.setTimeout(onDone, 2500);
	};

	if (started) return <p className="px-2 py-1 text-[12px] font-semibold">{t("agents.poste.started")}</p>;
	return (
		<div className="flex flex-col gap-1 rounded-xl bg-white/5 p-2">
			<div className="flex gap-1.5">
				<select
					className={cn(field, "flex-1")}
					value={project?.dir ?? ""}
					aria-label={t("agents.poste.project")}
					onChange={(e) => setSetting(newSessionSettings.project, e.target.value)}
				>
					{projects.map((p) => (
						<option key={`${p.host}${p.dir}`} value={p.dir} className="bg-black">
							{p.name}
						</option>
					))}
				</select>
				<select
					className={cn(field, "w-40")}
					value={tool?.id ?? ""}
					aria-label={t("agents.poste.provider")}
					onChange={(e) => setSetting(newSessionSettings.tool, e.target.value)}
				>
					{providers.map((p) => (
						<option key={p.id} value={p.id} className="bg-black">
							{p.label}
						</option>
					))}
				</select>
				<button type="button" className={button} disabled={!project || !tool || !!busy} onClick={launch}>
					{t(busy ? "agents.poste.launching" : "agents.poste.launch")}
				</button>
			</div>
			{error && <span className="text-[11px] text-[#ff453a]">{error}</span>}
		</div>
	);
}
