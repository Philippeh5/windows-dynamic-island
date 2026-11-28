import { useEffect, useRef, useState } from "react";
import { providerAction } from "../../../../core/bridge";
import { cn } from "../../../../core/cn";
import { useT } from "../../../../core/i18n";
import { POSTE_PROVIDER, type PosteMessage, type PosteSession } from "../../../../core/poste";

const READ_EVERY_MS = 3000;

/** What was said in a session of the post, read again while it is open. */
export function SessionThread({ session }: { session: PosteSession }) {
	const t = useT();
	const [messages, setMessages] = useState<PosteMessage[] | null>(null);
	const [error, setError] = useState("");
	const box = useRef<HTMLDivElement>(null);
	const { host, id } = session;

	useEffect(() => {
		let live = true;
		const read = () =>
			providerAction<{ messages: PosteMessage[] }>(POSTE_PROVIDER, "screen", { host, session: id, terminal: false })
				.then((r) => {
					if (!live) return;
					setMessages(r?.messages ?? []);
					setError("");
				})
				.catch((e) => live && setError(String(e)));
		read();
		const timer = window.setInterval(read, READ_EVERY_MS);
		return () => {
			live = false;
			window.clearInterval(timer);
		};
	}, [host, id]);

	// Follows the conversation: down to the newest message when one arrives.
	const last = messages?.at(-1)?.text;
	useEffect(() => {
		if (last !== undefined && box.current) box.current.scrollTop = box.current.scrollHeight;
	}, [last]);

	return (
		<div ref={box} className="flex max-h-64 flex-col gap-1.5 overflow-y-auto" data-scroll>
			{messages?.map((m, i) =>
				m.role === "tool" ? (
					// biome-ignore lint/suspicious/noArrayIndexKey: the thread only grows
					<p key={i} className="flex-none truncate px-1 text-[11px] text-text-faint">
						{m.text}
					</p>
				) : (
					<p
						// biome-ignore lint/suspicious/noArrayIndexKey: the thread only grows
						key={i}
						className={cn(
							"max-w-[88%] flex-none rounded-2xl px-3 py-1.5 text-[12.5px] break-words whitespace-pre-wrap select-text",
							m.role === "user" ? "self-end bg-[#a78bfa]/30" : "self-start bg-white/8",
							m.role === "error" && "text-[#ff453a]",
						)}
					>
						{m.text}
					</p>
				),
			)}
			{!messages?.length && !error && (
				<p className="px-1 text-[12px] text-text-faint">{messages ? t("agents.poste.noMessages") : "…"}</p>
			)}
			{session.group === "active" && <p className="px-1 text-[11px] text-text-faint">{t("agents.poste.working")}</p>}
			{error && <p className="px-1 text-[11px] text-[#ff453a]">{error}</p>}
		</div>
	);
}
