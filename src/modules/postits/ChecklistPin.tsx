import { ListChecksIcon, PinIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { command, useProvider } from "../../core/bridge";
import { cn } from "../../core/cn";
import { useT } from "../../core/i18n";
import { POSTE_PROVIDER, type PosteSession, type PosteState } from "../../core/poste";
import { usePosteAction, usePostePage } from "../../core/usePostePage";
import { noteLines } from "./checklist";
import { NoteText } from "./NoteText";
import type { Postits } from "./PostitsPanel";
import { aboutNote, currentChecklist, type Postit } from "./recent";

const LEAVE_MS = 350;
const CARD = 320;
const PINNED_KEY = "island.checklist.pinned";
const HIDDEN_KEY = "island.checklist.hidden";

const stored = <T,>(key: string, fallback: T): T => {
	try {
		return JSON.parse(localStorage.getItem(key) ?? "") as T;
	} catch {
		return fallback;
	}
};

/**
 * The current checklist as a round button beside the island: pointing at it
 * shows the note, the pin keeps it open. Boxes are ticked here (the agents tick
 * theirs on the post), and a question goes to the session of its subject.
 */
export function ChecklistPin(props: PinProps) {
	const poste = useProvider<PosteState>(POSTE_PROVIDER);
	if (!poste?.configured) return null;
	return <Pin poste={poste} {...props} />;
}

interface PinProps {
	size: number;
	upward: boolean;
	/** The pointer is on the button or its card: the island itself stays as it is. */
	onHover: (on: boolean) => void;
}

function Pin({ poste, size, upward, onHover }: PinProps & { poste: PosteState }) {
	const t = useT();
	const { data, refresh } = usePostePage<Postits>("postits", 10_000);
	const [pinned, setPinned] = useState(() => stored(PINNED_KEY, false));
	const [hidden, setHidden] = useState(() => stored<Record<string, number>>(HIDDEN_KEY, {}));
	const [over, setOver] = useState(false);
	const timer = useRef<number | undefined>(undefined);
	useEffect(() => () => window.clearTimeout(timer.current), []);
	const anchor = useRef<HTMLDivElement>(null);
	// Near the right edge of the screen, the card opens towards the left.
	const [leftwards, setLeftwards] = useState(false);
	useLayoutEffect(() => {
		const rect = anchor.current?.getBoundingClientRect();
		if (rect) setLeftwards(rect.left + CARD > window.innerWidth - 8);
	});
	const note = currentChecklist(data?.postits ?? [], Date.now(), hidden);
	if (!note) return null;

	const left = noteLines(note.text).filter((l) => l.kind === "box" && !l.done).length;
	const enter = () => {
		window.clearTimeout(timer.current);
		onHover(true);
		setOver(true);
	};
	const leave = () => {
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => {
			// Writing a question: the card stays.
			if (document.activeElement?.closest("[data-checklist] input")) return;
			setOver(false);
			onHover(false);
		}, LEAVE_MS);
	};
	const pin = () => {
		localStorage.setItem(PINNED_KEY, JSON.stringify(!pinned));
		setPinned(!pinned);
	};
	const hide = () => {
		const next = { ...hidden, [note.path]: note.updated ?? 0 };
		localStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
		setHidden(next);
		setOver(false);
		onHover(false);
	};

	return (
		<div
			ref={anchor}
			className="pointer-events-auto relative flex-none"
			data-checklist
			data-no-drag
			onPointerEnter={enter}
			onPointerLeave={leave}
			onClick={(e) => e.stopPropagation()}
			onKeyDown={(e) => e.stopPropagation()}
			onPointerDown={(e) => e.stopPropagation()}
			onWheel={(e) => e.stopPropagation()}
		>
			<button
				type="button"
				data-hit="bubble"
				className="grid place-items-center rounded-full bg-island text-[#fbe58b] shadow-[0_0_0_1.5px_#fbe58b88]"
				style={{ width: size, height: size }}
				aria-label={t("postits.checklist")}
				aria-expanded={pinned || over}
				onClick={() => setOver(!over)}
			>
				<span className="flex items-center gap-0.5 text-[11px] font-bold">
					<ListChecksIcon size={14} />
					{left}
				</span>
			</button>
			<AnimatePresence>
				{(pinned || over) && (
					<motion.div
						data-hit="bubble"
						className={cn(
							"absolute z-40",
							leftwards ? "right-0" : "left-0",
							upward ? "bottom-full pb-2" : "top-full pt-2",
						)}
						style={{ width: CARD }}
						initial={{ opacity: 0, scale: 0.94 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.94 }}
					>
						<div className="flex flex-col gap-2 rounded-[18px] bg-island p-2.5 text-text shadow-[0_18px_44px_-14px_rgba(0,0,0,0.8)]">
							<div className="flex items-center gap-1">
								<span className="min-w-0 flex-1 truncate px-1 text-[11.5px] font-[650] text-text-dim">
									{note.sujets.join(" · ") || t("postits.checklist")}
								</span>
								<button
									type="button"
									className={cn(
										"grid size-6 place-items-center rounded-full hover:bg-white/10",
										pinned && "bg-white/18",
									)}
									aria-label={t("postits.pin")}
									title={t("postits.pin")}
									aria-pressed={pinned}
									onClick={pin}
								>
									<PinIcon size={13} />
								</button>
								<button
									type="button"
									className="grid size-6 place-items-center rounded-full hover:bg-white/10"
									aria-label={t("postits.hide")}
									title={t("postits.hide")}
									onClick={hide}
								>
									<XIcon size={13} />
								</button>
							</div>
							<Boxes note={note} onChange={refresh} />
							<Ask note={note} sessions={poste.sessions ?? []} />
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

function Boxes({ note, onChange }: { note: Postit; onChange: () => void }) {
	const { busy, error, run } = usePosteAction();
	return (
		<div
			className="max-h-56 overflow-y-auto rounded-xl bg-[#fbe58b] px-3 py-2 text-[12.5px]/[1.5] font-medium break-words text-[#17120a] [scrollbar-width:thin]"
			data-scroll
		>
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
								if (await run("check", "checkPostit", payload)) onChange();
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
						className={cn("whitespace-pre-wrap", line.kind === "title" && "font-bold")}
					>
						<NoteText text={line.text} />
					</p>
				),
			)}
			{error && <p className="text-[11px] text-[#a30000]">{error}</p>}
		</div>
	);
}

/** A question about the note, sent to a session of the same project. */
function Ask({ note, sessions }: { note: Postit; sessions: PosteSession[] }) {
	const t = useT();
	const { busy, error, run } = usePosteAction();
	const [text, setText] = useState("");
	const [picked, setPicked] = useState("");
	const [sent, setSent] = useState(false);
	const matching = aboutNote(note, sessions);
	const choices = matching.length ? matching : sessions;
	const session = choices.find((s) => s.id === picked) ?? choices[0];
	if (!session) return null;

	const send = async () => {
		if (!text.trim() || busy) return;
		const title = noteLines(note.text)[0]?.text ?? "";
		const message = `Checklist « ${title.slice(0, 80)} » (post-it ${note.path}) : ${text.trim()}`;
		const target = { host: session.host, session: session.id, terminal: !!session.terminal };
		if (await run("ask", "send", { ...target, text: message })) {
			setText("");
			setSent(true);
		}
	};

	return (
		<div className="flex flex-col gap-1">
			{choices.length > 1 && (
				<select
					className="h-6 rounded-lg bg-white/8 px-1.5 text-[11.5px] outline-none"
					aria-label={t("postits.session")}
					value={session.id}
					onChange={(e) => setPicked(e.target.value)}
				>
					{choices.map((s) => (
						<option key={s.id} value={s.id} className="bg-black">
							{s.title}
						</option>
					))}
				</select>
			)}
			<input
				className="h-7 rounded-lg bg-white/8 px-2 text-[12px] outline-none"
				value={text}
				maxLength={600}
				placeholder={t("postits.ask", { session: session.title })}
				aria-label={t("postits.ask", { session: session.title })}
				onPointerDown={() => command("focus_island")}
				onChange={(e) => {
					setText(e.target.value);
					setSent(false);
				}}
				onKeyDown={(e) => e.key === "Enter" && send()}
			/>
			{(error || sent) && (
				<span className={cn("text-[11px]", error ? "text-[#ff453a]" : "text-text-faint")}>
					{error || t("agents.poste.sent")}
				</span>
			)}
		</div>
	);
}
