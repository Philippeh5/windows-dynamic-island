import { useState } from "react";
import { Area, button, Input } from "../../components/ui/post";
import { Empty } from "../../components/ui/text";
import { cn } from "../../core/cn";
import { useT } from "../../core/i18n";
import { usePosteAction, usePostePage } from "../../core/usePostePage";
import { noteLines } from "./checklist";

export interface Postits {
	postits: { path: string; text: string; sujets: string[]; couleur?: string; epingle: boolean }[];
}

const COLORS: Record<string, string> = {
	jaune: "#ffd60a",
	rose: "#ff6482",
	bleu: "#64a8ff",
	vert: "#30d158",
	violet: "#a78bfa",
	orange: "#ff9f0a",
};

export function PostitsPanel() {
	const t = useT();
	const { data, error, refresh } = usePostePage<Postits>("postits", 15_000);
	const { busy, error: failed, run } = usePosteAction();
	const [text, setText] = useState("");
	const [subject, setSubject] = useState("");

	if (!data) return <Empty>{error || t("postits.loading")}</Empty>;
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
			<div className="min-h-0 flex-1 columns-2 gap-2 overflow-y-auto" data-scroll>
				{data.postits.length === 0 && <Empty>{t("postits.empty")}</Empty>}
				{data.postits.map((note) => (
					<article
						key={note.path}
						className="mb-2 break-inside-avoid rounded-2xl border-l-3 bg-white/7 px-2.5 py-2 text-[12px]"
						style={{ borderColor: COLORS[note.couleur ?? ""] ?? COLORS.jaune }}
					>
						{noteLines(note.text).map((line, i) =>
							line.kind === "box" ? (
								<label key={line.index} className="flex items-start gap-1.5">
									<input
										type="checkbox"
										className="mt-0.5"
										checked={line.done}
										disabled={!!busy}
										onChange={async () => {
											const payload = { path: note.path, index: line.index, done: !line.done, label: line.text };
											if (await run(note.path, "checkPostit", payload)) refresh();
										}}
									/>
									<span className={cn("min-w-0 break-words", line.done && "text-text-faint line-through")}>
										{line.text}
									</span>
								</label>
							) : (
								// biome-ignore lint/suspicious/noArrayIndexKey: lines of a text, never reordered on their own
								<p key={`t${i}`} className={cn("break-words", line.kind === "title" && "font-bold")}>
									{line.text}
								</p>
							),
						)}
						{(note.sujets.length > 0 || note.epingle) && (
							<span className="mt-1 block truncate text-[10.5px] text-text-faint">
								{[note.epingle ? "📌" : "", ...note.sujets].filter(Boolean).join(" · ")}
							</span>
						)}
					</article>
				))}
			</div>
		</div>
	);
}
