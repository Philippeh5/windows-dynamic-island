import { useState, useSyncExternalStore } from "react";
import { command, providerAction } from "../../../../core/bridge";
import { cn } from "../../../../core/cn";
import { useT } from "../../../../core/i18n";
import { useIsland } from "../../../../core/island";
import { POSTE_PROVIDER, type PosteApproval, type PosteQuestion as Question } from "../../../../core/poste";
import { buildAnswers } from "./answers";

const button = "h-8 rounded-xl px-3.5 text-[12.5px] font-[650] disabled:opacity-35";
const card =
	"flex min-w-0 flex-col gap-2.5 rounded-[20px] bg-card px-4 py-3.5 shadow-[inset_0_0_0_1px_rgba(255,159,10,0.45)]";

/**
 * A question (or a permission) from an agent on the post, answered from the
 * island. Questions come one at a time: tick, or type another answer, go to the
 * next, then send everything.
 */
export function PosteQuestion({ item, more }: { item: PosteApproval; more: number }) {
	const t = useT();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [sent, setSent] = useState(false);

	const send = async (payload: Record<string, unknown>) => {
		setBusy(true);
		setError("");
		try {
			await providerAction(POSTE_PROVIDER, "answer", { id: item.id, ...payload });
			setSent(true);
			drafts.delete(item.id);
		} catch (e) {
			setError(String(e));
			setBusy(false);
		}
	};

	return (
		<div className={card} data-no-drag onClick={(e) => e.stopPropagation()}>
			<div className="flex items-center gap-2">
				<span className="size-2 flex-none rounded-full bg-[#ff9f0a]" />
				<span className="min-w-0 flex-1 truncate text-[12px] font-[650] text-text-dim">{item.title}</span>
				{more > 0 && <span className="text-[11px] font-bold text-[#ff9f0a]">+{more}</span>}
			</div>
			{sent ? (
				<p className="py-1 text-[13px] font-semibold">{t("agents.poste.sent")}</p>
			) : item.questions.length > 0 ? (
				<Steps id={item.id} questions={item.questions} busy={busy} onSend={(answers) => send({ answers })} />
			) : (
				<Permission item={item} busy={busy} onDecide={send} />
			)}
			{error && <span className="text-[11px] text-[#ff453a]">{error}</span>}
		</div>
	);
}

interface Draft {
	step: number;
	picked: string[][];
	typed: string[];
}

/** Answers under way, by question: the card can close and reopen (or move to the page) without losing them. */
const drafts = new Map<string, Draft>();
const draftListeners = new Set<() => void>();

function useDraft(id: string, count: number) {
	const [empty] = useState<Draft>(() => ({ step: 0, picked: Array(count).fill([]), typed: Array(count).fill("") }));
	const draft = useSyncExternalStore(
		(listener) => {
			draftListeners.add(listener);
			return () => draftListeners.delete(listener);
		},
		() => drafts.get(id) ?? empty,
	);
	const change = (part: Partial<Draft>) => {
		drafts.set(id, { ...(drafts.get(id) ?? empty), ...part });
		for (const listener of draftListeners) listener();
	};
	return [draft, change] as const;
}

function Steps({
	id,
	questions,
	busy,
	onSend,
}: {
	id: string;
	questions: Question[];
	busy: boolean;
	onSend: (answers: Record<string, string | string[]>) => void;
}) {
	const t = useT();
	const { keepOpen } = useIsland();
	const [{ step, picked, typed }, change] = useDraft(id, questions.length);
	const setStep = (step: number) => change({ step });
	const setPicked = (picked: string[][]) => change({ picked });
	const setTyped = (typed: string[]) => change({ typed });
	const q = questions[Math.min(step, questions.length - 1)];
	const answered = picked[step]?.length > 0 || !!typed[step]?.trim();
	const last = step >= questions.length - 1;

	const next = () => {
		if (!answered || busy) return;
		if (!last) return setStep(step + 1);
		const answers = buildAnswers(questions, picked, typed);
		if (answers) onSend(answers);
	};
	const toggle = (label: string) => {
		const on = picked[step].includes(label);
		const list = on ? picked[step].filter((l) => l !== label) : q.multiSelect ? [...picked[step], label] : [label];
		change({
			picked: picked.map((l, n) => (n === step ? list : l)),
			...(q.multiSelect ? {} : { typed: typed.map((v, n) => (n === step ? "" : v)) }),
		});
	};

	return (
		<>
			<div className="flex items-start gap-2">
				<span className="min-w-0 flex-1 text-[14px] font-[650]">{q.question}</span>
				{questions.length > 1 && (
					<span className="flex-none pt-0.5 text-[11px] font-bold text-text-faint">
						{step + 1}/{questions.length}
					</span>
				)}
			</div>
			<div
				className="flex flex-col gap-1"
				{...{ role: q.multiSelect ? "group" : "radiogroup", "aria-label": q.question }}
			>
				{q.options.map((o) => {
					const on = picked[step].includes(o.label);
					return (
						<button
							type="button"
							key={o.label}
							// A radio or a checkbox, as the question takes one answer or several.
							{...{ role: q.multiSelect ? "checkbox" : "radio", "aria-checked": on }}
							aria-label={o.label}
							disabled={busy}
							className={cn(
								"flex items-start gap-2.5 rounded-xl px-2.5 py-1.5 text-left",
								on ? "bg-[rgba(255,159,10,0.18)]" : "bg-white/6 hover:bg-white/11",
							)}
							onClick={() => toggle(o.label)}
						>
							<span
								className={cn(
									"mt-0.5 grid size-4 flex-none place-items-center border-[1.5px] text-[11px] leading-none font-black",
									q.multiSelect ? "rounded-[5px]" : "rounded-full",
									on ? "border-[#ff9f0a] bg-[#ff9f0a] text-black" : "border-white/35",
								)}
							>
								{on && (q.multiSelect ? "✓" : "●")}
							</span>
							<span className="flex min-w-0 flex-col">
								<span className="text-[12.5px] font-[650]">{o.label}</span>
								{o.description && <span className="text-[11.5px] text-text-dim">{o.description}</span>}
							</span>
						</button>
					);
				})}
			</div>
			<input
				// A new field per question: the keyboard does not carry over.
				key={step}
				className="h-8 min-w-0 flex-none rounded-xl bg-white/8 px-2.5 text-[12.5px] outline-none"
				value={typed[step] ?? ""}
				maxLength={300}
				placeholder={t("agents.poste.other")}
				aria-label={`${t("agents.poste.other")} ${q.question}`}
				onPointerDown={() => command("focus_island")}
				onFocus={() => keepOpen(true, "poste-reply")}
				onBlur={() => keepOpen(false, "poste-reply")}
				onChange={(e) => {
					const value = e.target.value;
					setTyped(typed.map((v, n) => (n === step ? value : v)));
					if (!q.multiSelect && value) setPicked(picked.map((l, n) => (n === step ? [] : l)));
				}}
				onKeyDown={(e) => e.key === "Enter" && next()}
			/>
			<div className="flex items-center justify-between gap-2">
				{step > 0 ? (
					<button type="button" className={cn(button, "bg-white/8")} disabled={busy} onClick={() => setStep(step - 1)}>
						{t("agents.poste.back")}
					</button>
				) : (
					<span />
				)}
				<button
					type="button"
					className={cn(button, "bg-[#ff9f0a] text-black")}
					disabled={busy || !answered}
					onClick={next}
				>
					{t(last ? "agents.poste.send" : "agents.poste.next")}
				</button>
			</div>
		</>
	);
}

function Permission({
	item,
	busy,
	onDecide,
}: {
	item: PosteApproval;
	busy: boolean;
	onDecide: (payload: Record<string, unknown>) => void;
}) {
	const t = useT();
	const [armed, setArmed] = useState(false);
	return (
		<>
			{item.body && (
				<p className="max-h-24 overflow-y-auto text-[12px] whitespace-pre-wrap text-text-dim" data-scroll>
					{item.body}
				</p>
			)}
			<div className="flex items-center gap-2">
				{item.refuseOnly ? (
					<span className="text-[11px] text-text-faint">{t("agents.poste.onPost")}</span>
				) : (
					<button
						type="button"
						className={cn(button, "bg-[#ff9f0a] text-black")}
						disabled={busy}
						onClick={() => {
							if (item.danger && !armed) return setArmed(true);
							onDecide({ decision: "approve", confirm: item.danger });
						}}
					>
						{t(armed ? "agents.poste.confirm" : "agents.permission.allow")}
					</button>
				)}
				<button
					type="button"
					className={cn(button, "bg-white/8 text-[#ff453a]")}
					disabled={busy}
					onClick={() => onDecide({ decision: "refuse" })}
				>
					{t("agents.permission.deny")}
				</button>
			</div>
		</>
	);
}
