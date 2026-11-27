import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Empty } from "../../components/ui/text";
import { command, providerAction } from "../../core/bridge";
import { cn } from "../../core/cn";
import { useLocale, useT } from "../../core/i18n";
import { POSTE_PROVIDER, type PosteTaskList } from "../../core/poste";
import { today } from "./summary";

const field = "h-7 min-w-0 rounded-lg bg-white/8 px-2 text-[12px] text-text outline-none [color-scheme:dark]";

/** One list at a time: tick a task off, add one, delete one. */
export function TasksPanel({ lists, error }: { lists: PosteTaskList[] | null | undefined; error?: string | null }) {
	const t = useT();
	const locale = useLocale();
	const [chosen, setChosen] = useState<string | null>(null);
	const [title, setTitle] = useState("");
	const [due, setDue] = useState("");
	const [busy, setBusy] = useState<string | null>(null);
	const [armed, setArmed] = useState<string | null>(null);
	const [failed, setFailed] = useState("");

	if (!lists) return <Empty>{error || t("tasks.loading")}</Empty>;
	// By default, the first list that has something to do.
	const list = lists.find((l) => l.id === chosen) ?? lists.find((l) => l.tasks.length) ?? lists[0];
	if (!list) return <Empty>{t("tasks.empty")}</Empty>;

	const run = async (key: string, action: string, payload: Record<string, unknown>) => {
		setBusy(key);
		setFailed("");
		try {
			await providerAction(POSTE_PROVIDER, action, payload);
			return true;
		} catch (e) {
			setFailed(String(e));
			return false;
		} finally {
			setBusy(null);
		}
	};
	const add = async () => {
		if (!title.trim() || busy) return;
		if (await run("add", "addTask", { list: list.id, title: title.trim(), due: due || null })) {
			setTitle("");
			setDue("");
		}
	};
	const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });

	return (
		<div className="flex h-full min-h-0 flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
			<div className="flex flex-wrap gap-1">
				{lists.map((l) => (
					<button
						type="button"
						key={l.id}
						className={cn(
							"h-6 rounded-xl px-2.5 text-[11.5px] font-[650]",
							l.id === list.id ? "bg-white/16 text-text" : "bg-white/6 text-text-dim hover:bg-white/10",
						)}
						onClick={() => setChosen(l.id)}
					>
						{l.title}
						{l.tasks.length > 0 && <span className="ml-1.5 text-text-faint">{l.tasks.length}</span>}
					</button>
				))}
			</div>
			<ul className="min-h-0 flex-1 list-none overflow-y-auto [scrollbar-width:none]" data-scroll>
				{list.tasks.length === 0 && <li className="px-2 py-1 text-[12px] text-text-faint">{t("tasks.empty")}</li>}
				{list.tasks.map((task) => (
					<li key={task.id} className="group flex h-7.5 items-center gap-2.5 rounded-lg px-2 hover:bg-white/5">
						<button
							type="button"
							className="size-4 flex-none rounded-full border-[1.5px] border-white/35 hover:border-[#4285F4] hover:bg-[#4285F4]/40 disabled:animate-pulse"
							aria-label={`${t("tasks.done")}: ${task.title}`}
							title={t("tasks.done")}
							disabled={busy === task.id}
							onClick={() => run(task.id, "completeTask", { list: list.id, task: task.id })}
						/>
						<span className="min-w-0 flex-1 truncate text-[12.5px] font-[550]" title={task.title}>
							{task.title}
						</span>
						{task.due && (
							<span className={cn("text-[11px] text-text-faint", task.due <= today() && "text-[#ff453a]")}>
								{day.format(new Date(`${task.due}T00:00`))}
							</span>
						)}
						<button
							type="button"
							className={cn(
								"h-5 flex-none rounded-[10px] px-1.5 text-[10.5px] font-bold text-text-faint opacity-0 group-hover:opacity-100",
								armed === task.id && "bg-[#ff453a] text-white opacity-100",
							)}
							aria-label={`${t("tasks.delete")}: ${task.title}`}
							onClick={() => {
								if (armed !== task.id) return setArmed(task.id);
								setArmed(null);
								run(task.id, "deleteTask", { list: list.id, task: task.id });
							}}
						>
							{armed === task.id ? t("tasks.confirm") : <Trash2Icon size={12} />}
						</button>
					</li>
				))}
			</ul>
			<div className="flex gap-1" data-no-drag>
				<input
					className={`${field} flex-1`}
					value={title}
					maxLength={500}
					placeholder={t("tasks.new")}
					aria-label={t("tasks.new")}
					onPointerDown={() => command("focus_island")}
					onChange={(e) => setTitle(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && add()}
				/>
				<input
					type="date"
					className={field}
					value={due}
					aria-label={t("tasks.due")}
					onPointerDown={() => command("focus_island")}
					onChange={(e) => setDue(e.target.value)}
				/>
				<button
					type="button"
					className="h-7 rounded-lg bg-[#4285F4] px-3 text-[12px] font-bold text-white disabled:opacity-40"
					disabled={busy === "add" || !title.trim()}
					onClick={add}
				>
					{t("tasks.add")}
				</button>
			</div>
			{(failed || error) && <span className="truncate text-[11px] text-[#ff453a]">{failed || error}</span>}
		</div>
	);
}
