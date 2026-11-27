import { useEffect, useRef, useState } from "react";
import { SectionLabel } from "../../../../components/ui/text";
import { command, providerAction } from "../../../../core/bridge";
import { cn } from "../../../../core/cn";
import { useT } from "../../../../core/i18n";
import { useIsland } from "../../../../core/island";
import { POSTE_PROVIDER, type PosteSession } from "../../../../core/poste";

const DOT: Record<string, string> = { active: "bg-[#30d158]", waiting: "bg-[#ff9f0a]", error: "bg-[#ff453a]" };

/** The sessions open on the post. Click one to read it and send it a message. */
export function PosteSessions({ sessions }: { sessions: PosteSession[] }) {
	const t = useT();
	const [open, setOpen] = useState<string | null>(null);
	const chosen = sessions.find((s) => s.id === open);

	return (
		<div className="flex min-w-0 flex-col gap-1" onClick={(e) => e.stopPropagation()}>
			<SectionLabel>{t("agents.poste.sessions")}</SectionLabel>
			{sessions.length === 0 && <span className="px-2 text-[12px] text-text-faint">{t("agents.poste.none")}</span>}
			<ul className="flex list-none flex-col gap-0.5">
				{sessions.map((s) => (
					<li key={s.id}>
						<button
							type="button"
							className={cn(
								"flex h-7 w-full items-center gap-2 rounded-lg px-2 text-left text-[12.5px] hover:bg-white/6",
								s.group === "waiting" && "bg-[rgba(255,159,10,0.14)]",
								s.id === open && "bg-white/10",
							)}
							aria-expanded={s.id === open}
							onClick={() => setOpen(s.id === open ? null : s.id)}
						>
							<span className={cn("size-1.75 flex-none rounded-full", DOT[s.group] ?? "bg-white/30")} />
							<span className="flex-none font-bold">{s.title}</span>
							<span className="min-w-0 flex-1 truncate text-text-dim">{s.detail}</span>
							<span className={cn("flex-none text-[11px] text-text-faint", s.group === "waiting" && "text-[#ff9f0a]")}>
								{s.status}
							</span>
						</button>
						{chosen && s.id === open && <SessionDetail session={chosen} />}
					</li>
				))}
			</ul>
		</div>
	);
}

function SessionDetail({ session }: { session: PosteSession }) {
	const t = useT();
	const { keepOpen } = useIsland();
	const [lines, setLines] = useState<string[] | null>(null);
	const [text, setText] = useState("");
	const [busy, setBusy] = useState(false);
	const [note, setNote] = useState("");
	const screen = useRef<HTMLPreElement>(null);
	const target = { host: session.host, session: session.id, terminal: !!session.terminal };
	const key = `${session.host}/${session.id}`;

	// A terminal's screen, read again every few seconds while it is open.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `target` is rebuilt on each render; the session is its identity
	useEffect(() => {
		if (!session.terminal) return;
		let live = true;
		const read = () =>
			providerAction<{ lines: string[] }>(POSTE_PROVIDER, "screen", target)
				.then((r) => live && setLines(r?.lines ?? []))
				.catch((e) => live && setNote(String(e)));
		read();
		const id = window.setInterval(read, 4000);
		return () => {
			live = false;
			window.clearInterval(id);
		};
	}, [key]);
	useEffect(() => {
		if (lines && screen.current) screen.current.scrollTop = screen.current.scrollHeight;
	}, [lines]);

	const send = async () => {
		if (!text.trim() || busy) return;
		setBusy(true);
		setNote("");
		try {
			await providerAction(POSTE_PROVIDER, "send", { ...target, text: text.trim() });
			setText("");
			setNote(t("agents.poste.sent"));
		} catch (e) {
			// The post refuses while a menu or a permission is on screen, and says so.
			setNote(String(e));
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="flex flex-col gap-1.5 px-2 pt-1 pb-1.5">
			{session.terminal && (
				<pre
					ref={screen}
					className="max-h-32 overflow-auto rounded-lg bg-white/5 p-2 font-mono text-[10.5px]/snug whitespace-pre-wrap text-text-dim"
					data-scroll
				>
					{lines === null ? "…" : lines.join("\n")}
				</pre>
			)}
			<div className="flex gap-1">
				<input
					className="h-7 min-w-0 flex-1 rounded-lg bg-white/8 px-2 text-[12px] outline-none"
					value={text}
					maxLength={1000}
					placeholder={t("agents.poste.message")}
					aria-label={t("agents.poste.message")}
					onPointerDown={() => command("focus_island")}
					onFocus={() => keepOpen(true, "poste-message")}
					onBlur={() => keepOpen(false, "poste-message")}
					onChange={(e) => setText(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && send()}
				/>
				<button
					type="button"
					className="rounded-lg bg-white/12 px-3 text-[12px] font-[650] disabled:opacity-40"
					disabled={busy || !text.trim()}
					onClick={send}
				>
					{t("agents.poste.send")}
				</button>
			</div>
			{note && <span className="text-[11px] text-text-faint">{note}</span>}
		</div>
	);
}
