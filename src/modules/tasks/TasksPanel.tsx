import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Area, field, Input } from "../../components/ui/post";
import { Empty } from "../../components/ui/text";
import { providerAction } from "../../core/bridge";
import { cn } from "../../core/cn";
import { useLocale, useT } from "../../core/i18n";
import { POSTE_PROVIDER, type PosteTask, type PosteTaskList } from "../../core/poste";
import { today } from "./summary";

const blue = "h-7 flex-none rounded-lg bg-[#4285F4] px-3 text-[12px] font-bold text-[#fff] disabled:opacity-40";

/**
 * One list at a time: tick a task off, add one, open one to read or change its
 * description. The page changes at once; Google follows, and what fails comes back.
 */
export function TasksPanel({ lists, error }: { lists: PosteTaskList[] | null | undefined; error?: string | null }) {
	const t = useT();
	const locale = useLocale();
	const [chosen, setChosen] = useState<string | null>(null);
	const [title, setTitle] = useState("");
	const [notes, setNotes] = useState("");
	const [due, setDue] = useState("");
	const [more, setMore] = useState(false);
	const [open, setOpen] = useState<string | null>(null);
	const [armed, setArmed] = useState<string | null>(null);
	const [failed, setFailed] = useState("");
	/** Ticked off or deleted, before Google says so. */
	const [gone, setGone] = useState<string[]>([]);
	/** Being added. */
	const [adding, setAdding] = useState<{ key: number; list: string; title: string }[]>([]);

	if (!lists) return <Empty>{error || t("tasks.loading")}</Empty>;
	// By default, the first list that has something to do.
	const list = lists.find((l) => l.id === chosen) ?? lists.find((l) => l.tasks.length) ?? lists[0];
	if (!list) return <Empty>{t("tasks.empty")}</Empty>;

	const run = async (action: string, payload: Record<string, unknown>) => {
		setFailed("");
		try {
			await providerAction(POSTE_PROVIDER, action, payload);
			return true;
		} catch (e) {
			setFailed(String(e));
			return false;
		}
	};
	const remove = async (task: PosteTask, action: string) => {
		setGone((g) => [...g, task.id]);
		if (!(await run(action, { list: list.id, task: task.id }))) setGone((g) => g.filter((id) => id !== task.id));
	};
	const add = async () => {
		const wanted = { list: list.id, title: title.trim(), notes: notes.trim() || null, due: due || null };
		if (!wanted.title) return;
		const key = Date.now();
		setAdding((a) => [...a, { key, list: wanted.list, title: wanted.title }]);
		setTitle("");
		setNotes("");
		setDue("");
		setMore(false);
		const ok = await run("addTask", wanted);
		setAdding((a) => a.filter((x) => x.key !== key));
		// Nothing typed is lost.
		if (!ok) {
			setTitle(wanted.title);
			setNotes(wanted.notes ?? "");
			setDue(wanted.due ?? "");
		}
	};
	const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
	const shown = list.tasks.filter((task) => !gone.includes(task.id));

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
			<ul className="min-h-0 flex-1 list-none overflow-y-auto [scrollbar-width:thin]" data-scroll>
				{shown.length === 0 && adding.length === 0 && (
					<li className="px-2 py-1 text-[12px] text-text-faint">{t("tasks.empty")}</li>
				)}
				{adding
					.filter((a) => a.list === list.id)
					.map((a) => (
						<li key={a.key} className="flex h-7.5 animate-pulse items-center gap-2.5 px-2 text-[12.5px] text-text-dim">
							<span className="size-4 flex-none rounded-full border-[1.5px] border-white/20" />
							<span className="min-w-0 truncate">{a.title}</span>
						</li>
					))}
				{shown.map((task) => (
					<li key={task.id} className="group rounded-lg px-2 py-1 hover:bg-white/5">
						<div className="flex items-start gap-2.5">
							<button
								type="button"
								className="mt-0.5 size-4 flex-none rounded-full border-[1.5px] border-white/35 hover:border-[#4285F4] hover:bg-[#4285F4]/40"
								aria-label={`${t("tasks.done")}: ${task.title}`}
								title={t("tasks.done")}
								onClick={() => remove(task, "completeTask")}
							/>
							<button
								type="button"
								className="flex min-w-0 flex-1 flex-col items-start text-left"
								aria-expanded={open === task.id}
								onClick={() => setOpen(open === task.id ? null : task.id)}
							>
								<span className="max-w-full text-[12.5px] font-[550] break-words">{task.title}</span>
								{task.notes && open !== task.id && (
									<span className="line-clamp-2 max-w-full text-[11.5px] break-words whitespace-pre-line text-text-dim">
										{task.notes}
									</span>
								)}
							</button>
							{task.due && (
								<span className={cn("flex-none text-[11px] text-text-faint", task.due <= today() && "text-[#ff453a]")}>
									{day.format(new Date(`${task.due}T00:00`))}
								</span>
							)}
							<button
								type="button"
								className={cn(
									"h-5 flex-none rounded-[10px] px-1.5 text-[10.5px] font-bold text-text-faint opacity-0 group-hover:opacity-100",
									armed === task.id && "bg-[#ff453a] text-[#fff] opacity-100",
								)}
								aria-label={`${t("tasks.delete")}: ${task.title}`}
								onClick={() => {
									if (armed !== task.id) return setArmed(task.id);
									setArmed(null);
									remove(task, "deleteTask");
								}}
							>
								{armed === task.id ? t("tasks.confirm") : <Trash2Icon size={12} />}
							</button>
						</div>
						{open === task.id && (
							<Editor
								task={task}
								onSave={async (changes) => {
									setOpen(null);
									if (!(await run("editTask", { list: list.id, task: task.id, ...changes }))) setOpen(task.id);
								}}
							/>
						)}
					</li>
				))}
			</ul>
			<div className="flex flex-col gap-1" data-no-drag>
				{more && (
					<Area
						reason="task-notes"
						rows={2}
						value={notes}
						maxLength={8000}
						placeholder={t("tasks.notes")}
						aria-label={t("tasks.notes")}
						onChange={(e) => setNotes(e.target.value)}
					/>
				)}
				<div className="flex gap-1">
					<Input
						reason="task-title"
						className="flex-1"
						value={title}
						maxLength={500}
						placeholder={t("tasks.new")}
						aria-label={t("tasks.new")}
						onChange={(e) => setTitle(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && add()}
					/>
					<button
						type="button"
						className={cn(field, "flex-none", more && "bg-white/16")}
						aria-pressed={more}
						title={t("tasks.notes")}
						onClick={() => setMore(!more)}
					>
						≡
					</button>
					<Input
						reason="task-due"
						type="date"
						value={due}
						aria-label={t("tasks.due")}
						onChange={(e) => setDue(e.target.value)}
					/>
					<button type="button" className={blue} disabled={!title.trim()} onClick={add}>
						{t("tasks.add")}
					</button>
				</div>
			</div>
			{(failed || error) && <span className="truncate text-[11px] text-[#ff453a]">{failed || error}</span>}
		</div>
	);
}

/** A task's title, description and due date. */
function Editor({
	task,
	onSave,
}: {
	task: PosteTask;
	onSave: (changes: { title: string; notes: string; due: string | null }) => void;
}) {
	const t = useT();
	const [title, setTitle] = useState(task.title);
	const [notes, setNotes] = useState(task.notes ?? "");
	const [due, setDue] = useState(task.due ?? "");
	return (
		<div className="mt-1 ml-6.5 flex flex-col gap-1" data-no-drag>
			<Input
				reason="task-edit"
				value={title}
				maxLength={500}
				aria-label={t("tasks.title")}
				onChange={(e) => setTitle(e.target.value)}
			/>
			<Area
				reason="task-edit-notes"
				rows={3}
				value={notes}
				maxLength={8000}
				placeholder={t("tasks.notes")}
				aria-label={t("tasks.notes")}
				onChange={(e) => setNotes(e.target.value)}
			/>
			<div className="flex gap-1">
				<Input
					reason="task-edit-due"
					type="date"
					value={due}
					aria-label={t("tasks.due")}
					onChange={(e) => setDue(e.target.value)}
				/>
				<button
					type="button"
					className={blue}
					disabled={!title.trim()}
					// Google keeps the old date when none is sent.
					onClick={() => onSave({ title: title.trim(), notes, due: due || null })}
				>
					{t("tasks.save")}
				</button>
			</div>
		</div>
	);
}
