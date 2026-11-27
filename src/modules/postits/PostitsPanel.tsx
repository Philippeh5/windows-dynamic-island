import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { Area, button, Input } from "../../components/ui/post";
import { Empty } from "../../components/ui/text";
import { cn } from "../../core/cn";
import { useT } from "../../core/i18n";
import { usePosteAction, usePostePage } from "../../core/usePostePage";
import { noteLines } from "./checklist";
import { plain } from "./inline";
import { NoteText } from "./NoteText";

export interface Postits {
	postits: {
		path: string;
		text: string;
		/** Too long to arrive whole: not editable here. */
		cut?: boolean;
		sujets: string[];
		couleur?: string;
		epingle: boolean;
	}[];
}

/* The paper colors of the post's Notes page, with dark ink in either theme. */
const PAPER: Record<string, string> = {
	jaune: "#fbe58b",
	rose: "#f7c4cf",
	bleu: "#bfdcf2",
	vert: "#c9e7b8",
	orange: "#f8c99a",
	violet: "#dccbf0",
};

export function PostitsPanel() {
	const t = useT();
	const { data, error, refresh } = usePostePage<Postits>("postits", 15_000);
	const { busy, error: failed, run } = usePosteAction();
	const [text, setText] = useState("");
	const [subject, setSubject] = useState("");
	const [editing, setEditing] = useState(() => draft);
	// Kept outside the page: the island can close while a note is being written.
	const edit = (next: Draft | null) => {
		draft = next;
		setEditing(next);
	};

	if (!data) return <Empty>{error || t("postits.loading")}</Empty>;
	const save = async () => {
		if (!editing?.text.trim() || busy) return;
		if (await run("edit", "editPostit", { ...editing, text: editing.text.trim() })) {
			edit(null);
			refresh();
		}
	};
	const add = async () => {
		if (!text.trim() || busy) return;
		if (await run("add", "postit", { text: text.trim(), subject: subject.trim() })) {
			setText("");
			refresh();
		}
	};
	const subjects = [...new Set(data.postits.flatMap((n) => n.sujets))];

	return (
		<div className="flex h-full min-h-0 flex-col gap-2" onClick={(e) => e.stopPropagation()}>
			<div className="flex gap-1.5">
				<Area
					reason="postit"
					className="flex-1"
					rows={2}
					value={text}
					maxLength={2000}
					placeholder={t("postits.new")}
					aria-label={t("postits.new")}
					onChange={(e) => setText(e.target.value)}
				/>
				<div className="flex flex-col gap-1">
					<Input
						reason="postit-subject"
						className="w-32"
						list="postit-subjects"
						value={subject}
						maxLength={40}
						placeholder={t("postits.subject")}
						aria-label={t("postits.subject")}
						onChange={(e) => setSubject(e.target.value)}
					/>
					<datalist id="postit-subjects">
						{subjects.map((s) => (
							<option key={s} value={s} />
						))}
					</datalist>
					<button type="button" className={button} disabled={!text.trim() || !!busy} onClick={add}>
						{t("postits.add")}
					</button>
				</div>
			</div>
			{(failed || error) && <span className="truncate text-[11px] text-[#ff453a]">{failed || error}</span>}
			{editing ? (
				<Editor draft={editing} busy={!!busy} onChange={edit} onSave={save} />
			) : (
				<div
					className="grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(300px,1fr))] auto-rows-max content-start items-start gap-3 overflow-y-auto px-1 pt-1 pb-2"
					data-scroll
				>
					{data.postits.length === 0 && <Empty>{t("postits.empty")}</Empty>}
					{data.postits.map((note) => (
						<article
							key={note.path}
							className="max-h-64 overflow-y-auto rounded-[4px_4px_16px_4px] px-3.5 py-3 text-[13.5px]/[1.5] font-medium break-words text-[#17120a] shadow-[0_4px_10px_rgba(0,0,0,0.25)] [scrollbar-width:thin]"
							style={{ background: PAPER[note.couleur ?? ""] ?? PAPER.jaune }}
						>
							{!note.cut && (
								<button
									type="button"
									className="float-right -mt-1 -mr-1.5 ml-1.5 grid size-6 place-items-center rounded-full text-[#17120a] opacity-60 hover:bg-black/10 hover:opacity-100"
									aria-label={`${t("postits.edit")}: ${noteTitle(note.text)}`}
									title={t("postits.edit")}
									onClick={() =>
										edit({ path: note.path, before: note.text, text: note.text, color: note.couleur ?? "jaune" })
									}
								>
									<PencilIcon size={13} />
								</button>
							)}
							{noteLines(note.text).map((line, i) =>
								line.kind === "box" ? (
									<label key={line.index} className="flex cursor-pointer items-start gap-1.5">
										<input
											type="checkbox"
											className="mt-0.75 accent-[#241d12] [color-scheme:light]"
											checked={line.done}
											disabled={!!busy}
											onChange={async () => {
												const payload = { path: note.path, index: line.index, done: !line.done, label: line.text };
												if (await run(note.path, "checkPostit", payload)) refresh();
											}}
										/>
										<span className={cn("min-w-0", line.done && "line-through opacity-60")}>
											<NoteText text={line.text} />
										</span>
									</label>
								) : (
									<p
										// biome-ignore lint/suspicious/noArrayIndexKey: lines of a text, never reordered on their own
										key={`t${i}`}
										className={cn("mb-0.5 whitespace-pre-wrap", line.kind === "title" && "text-[14.5px] font-bold")}
									>
										<NoteText text={line.text.replace(/^\s*[-*]\s+/, "• ")} />
									</p>
								),
							)}
							{(note.sujets.length > 0 || note.epingle) && (
								<span className="mt-1.5 block truncate text-[11.5px] opacity-75">
									{[note.epingle ? "📌" : "", ...note.sujets].filter(Boolean).join(" · ")}
								</span>
							)}
						</article>
					))}
				</div>
			)}
		</div>
	);
}

interface Draft {
	path: string;
	/** The text as it was when editing began: the post refuses to overwrite anything newer. */
	before: string;
	text: string;
	color: string;
}

let draft: Draft | null = null;

const noteTitle = (text: string) => plain(text.split("\n")[0].replace(/^#+\s*/, ""));

/** One note's text (Markdown, as stored) and its paper color. */
function Editor({
	draft,
	busy,
	onChange,
	onSave,
}: {
	draft: Draft;
	busy: boolean;
	onChange: (next: Draft | null) => void;
	onSave: () => void;
}) {
	const t = useT();
	return (
		<div className="flex min-h-0 flex-1 flex-col gap-2" data-no-drag>
			<Area
				reason="postit-edit"
				className="min-h-0 flex-1 !rounded-xl !bg-[var(--paper)] !text-[13.5px]/[1.5] !text-[#17120a] [color-scheme:light]"
				style={{ "--paper": PAPER[draft.color] ?? PAPER.jaune } as React.CSSProperties}
				value={draft.text}
				maxLength={8000}
				aria-label={t("postits.edit")}
				onChange={(e) => onChange({ ...draft, text: e.target.value })}
			/>
			<div className="flex items-center gap-2">
				{Object.entries(PAPER).map(([name, paper]) => (
					<button
						type="button"
						key={name}
						className={cn("size-5.5 rounded-full", draft.color === name && "ring-2 ring-text")}
						style={{ background: paper }}
						aria-label={name}
						aria-pressed={draft.color === name}
						onClick={() => onChange({ ...draft, color: name })}
					/>
				))}
				<span className="flex-1" />
				<button type="button" className={button} disabled={busy} onClick={() => onChange(null)}>
					{t("postits.cancel")}
				</button>
				<button type="button" className={button} disabled={busy || !draft.text.trim()} onClick={onSave}>
					{t("postits.save")}
				</button>
			</div>
		</div>
	);
}
