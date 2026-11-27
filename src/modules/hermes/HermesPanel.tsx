import { useEffect, useRef, useState } from "react";
import { button, Input } from "../../components/ui/post";
import { Empty } from "../../components/ui/text";
import { cn } from "../../core/cn";
import { useT } from "../../core/i18n";
import { useSetting, voiceSetting } from "../../core/settings";
import { usePosteAction, usePostePage } from "../../core/usePostePage";

export interface HermesThread {
	available: boolean;
	busy: boolean;
	error: string | null;
	messages: { role: string; text: string }[];
}

export function HermesPanel() {
	const t = useT();
	const voice = useSetting(voiceSetting);
	const { data, error, refresh } = usePostePage<HermesThread>("hermes", 3000);
	const { busy, error: failed, run } = usePosteAction();
	const [text, setText] = useState("");
	const end = useRef<HTMLDivElement>(null);
	const count = data?.messages.length ?? 0;

	useEffect(() => {
		if (count) end.current?.scrollIntoView({ block: "nearest" });
	}, [count]);

	if (!data) return <Empty>{error || t("hermes.loading")}</Empty>;
	const send = async () => {
		if (!text.trim() || busy || data.busy) return;
		// With the voice on, the reply also comes as an announcement, read aloud.
		if (await run("say", "say", { text: text.trim(), speak: voice })) {
			setText("");
			refresh();
		}
	};

	return (
		<div className="flex h-full min-h-0 flex-col gap-2" onClick={(e) => e.stopPropagation()}>
			<div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto" data-scroll>
				{data.messages.map((m, i) => (
					<p
						// biome-ignore lint/suspicious/noArrayIndexKey: the thread only grows
						key={i}
						className={cn(
							"max-w-[85%] flex-none rounded-2xl px-3 py-1.5 text-[12.5px] break-words whitespace-pre-wrap",
							m.role === "user" ? "self-end bg-[#a78bfa]/30" : "self-start bg-white/8",
						)}
					>
						{m.text}
					</p>
				))}
				{data.busy && <p className="flex-none text-[12px] text-text-faint">{t("hermes.thinking")}</p>}
				{!data.available && <Empty>{t("hermes.unavailable")}</Empty>}
				<div ref={end} />
			</div>
			{(failed || data.error || error) && (
				<span className="truncate text-[11px] text-[#ff453a]">{failed || data.error || error}</span>
			)}
			<div className="flex gap-1.5">
				<Input
					reason="hermes"
					className="flex-1"
					value={text}
					maxLength={2000}
					placeholder={t("hermes.write")}
					aria-label={t("hermes.write")}
					onChange={(e) => setText(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && send()}
				/>
				<button type="button" className={button} disabled={!text.trim() || !!busy || data.busy} onClick={send}>
					{t("hermes.send")}
				</button>
			</div>
		</div>
	);
}
