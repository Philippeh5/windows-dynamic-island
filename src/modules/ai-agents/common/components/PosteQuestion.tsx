import { useState } from "react";
import { command, providerAction } from "../../../../core/bridge";
import { cn } from "../../../../core/cn";
import { useT } from "../../../../core/i18n";
import { useIsland } from "../../../../core/island";
import { POSTE_PROVIDER, type PosteApproval } from "../../../../core/poste";
import { buildAnswers } from "./answers";

const button = "rounded-xl px-3 py-1.5 text-[12px] font-[650] disabled:opacity-40";

/**
 * A question (or a permission) from an agent on the post, answered from the
 * island: what it wrote, the choices, a free answer. A single simple choice
 * goes at once; several choices or questions are sent together.
 */
export function PosteQuestion({ item, more }: { item: PosteApproval; more: number }) {
	const t = useT();
	const { keepOpen } = useIsland();
	const [picked, setPicked] = useState<string[][]>(() => item.questions.map(() => []));
	const [typed, setTyped] = useState<string[]>(() => item.questions.map(() => ""));
	const [busy, setBusy] = useState(false);
	const [armed, setArmed] = useState(false);
	const [error, setError] = useState("");
	const instant = item.questions.length === 1 && !item.questions[0].multiSelect;

	const send = async (payload: Record<string, unknown>) => {
		setBusy(true);
		setError("");
		try {
			await providerAction(POSTE_PROVIDER, "answer", { id: item.id, ...payload });
		} catch (e) {
			setError(String(e));
			setBusy(false);
		}
	};
	const submit = () => {
		const answers = buildAnswers(item.questions, picked, typed);
		if (answers) send({ answers });
		else setError(t("agents.poste.incomplete"));
	};

	return (
		<div
			className="flex min-w-0 flex-col gap-2 rounded-[20px] bg-card px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,159,10,0.45)]"
			onClick={(e) => e.stopPropagation()}
		>
			<div className="flex items-center gap-2">
				<span className="size-2 flex-none rounded-full bg-[#ff9f0a]" />
				<span className="min-w-0 flex-1 truncate text-[13.5px] font-[650]">{item.title}</span>
				{more > 0 && <span className="text-[11px] font-bold text-[#ff9f0a]">+{more}</span>}
			</div>
			{item.body && (
				<p className="max-h-20 overflow-y-auto text-[12px] whitespace-pre-wrap text-text-dim" data-scroll>
					{item.body}
				</p>
			)}
			{item.questions.map((q, i) => (
				<div key={q.question} className="flex flex-col gap-1.5">
					<span className="text-[12.5px] font-semibold">{q.question}</span>
					<div className="flex flex-wrap gap-1.5">
						{q.options.map((o) => {
							const on = picked[i]?.includes(o.label);
							return (
								<button
									type="button"
									key={o.label}
									className={cn(button, "text-left", on ? "bg-[#ff9f0a] text-black" : "bg-white/8 hover:bg-white/14")}
									title={o.description}
									aria-pressed={on}
									disabled={busy}
									onClick={() => {
										if (instant) return send({ answers: { [q.question]: o.label } });
										const next = picked.map((list, n) => {
											if (n !== i) return list;
											if (on) return list.filter((l) => l !== o.label);
											return q.multiSelect ? [...list, o.label] : [o.label];
										});
										setPicked(next);
										if (!q.multiSelect) setTyped(typed.map((v, n) => (n === i ? "" : v)));
									}}
								>
									{o.label}
								</button>
							);
						})}
					</div>
					<input
						className="h-7 min-w-0 rounded-lg bg-white/8 px-2 text-[12px] outline-none"
						value={typed[i] ?? ""}
						maxLength={300}
						placeholder={t("agents.poste.other")}
						aria-label={`${t("agents.poste.other")} ${q.question}`}
						onPointerDown={() => command("focus_island")}
						onFocus={() => keepOpen(true, "poste-reply")}
						onBlur={() => keepOpen(false, "poste-reply")}
						onChange={(e) => {
							setTyped(typed.map((v, n) => (n === i ? e.target.value : v)));
							if (!q.multiSelect && e.target.value) setPicked(picked.map((list, n) => (n === i ? [] : list)));
						}}
						onKeyDown={(e) => e.key === "Enter" && submit()}
					/>
				</div>
			))}
			<div className="flex items-center gap-2">
				{item.questions.length > 0 ? (
					<button type="button" className={cn(button, "bg-[#ff9f0a] text-black")} disabled={busy} onClick={submit}>
						{t("agents.poste.send")}
					</button>
				) : (
					<>
						{item.refuseOnly ? (
							<span className="text-[11px] text-text-faint">{t("agents.poste.onPost")}</span>
						) : (
							<button
								type="button"
								className={cn(button, "bg-[#ff9f0a] text-black")}
								disabled={busy}
								onClick={() => {
									if (item.danger && !armed) return setArmed(true);
									send({ decision: "approve", confirm: item.danger });
								}}
							>
								{t(armed ? "agents.poste.confirm" : "agents.permission.allow")}
							</button>
						)}
						<button
							type="button"
							className={cn(button, "bg-white/8 text-[#ff453a]")}
							disabled={busy}
							onClick={() => send({ decision: "refuse" })}
						>
							{t("agents.permission.deny")}
						</button>
					</>
				)}
				{error && <span className="min-w-0 flex-1 truncate text-[11px] text-[#ff453a]">{error}</span>}
			</div>
		</div>
	);
}
