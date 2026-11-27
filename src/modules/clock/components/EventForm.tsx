import { useState } from "react";
import { command, providerAction } from "../../../core/bridge";
import { useT } from "../../../core/i18n";
import { POSTE_PROVIDER } from "../../../core/poste";
import type { CalEvent } from "../types";

const LENGTHS = [15, 30, 60, 120];

const pad = (n: number) => String(n).padStart(2, "0");
/** `YYYY-MM-DDTHH:MM`, local time, as a date-time field wants it. */
const local = (at: Date) =>
	`${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;

/** Adds or changes one event of the post's calendar. */
export function EventForm({ event, day, onDone }: { event: CalEvent | null; day: Date; onDone: () => void }) {
	const t = useT();
	const [title, setTitle] = useState(event?.title ?? "");
	const [start, setStart] = useState(() => {
		if (event) return local(new Date(event.start));
		const next = new Date(day);
		next.setHours(new Date().getHours() + 1, 0, 0, 0);
		return local(next);
	});
	const [minutes, setMinutes] = useState(event ? Math.max(5, Math.round((event.end - event.start) / 60_000)) : 30);
	const [busy, setBusy] = useState(false);
	const [armed, setArmed] = useState(false);
	const [error, setError] = useState("");

	const run = async (action: string, payload: Record<string, unknown>) => {
		setBusy(true);
		setError("");
		try {
			await providerAction(POSTE_PROVIDER, action, payload);
			onDone();
		} catch (e) {
			setError(String(e));
			setBusy(false);
		}
	};
	const save = () => {
		if (title.trim() && start) run("saveEvent", { id: event?.id ?? null, title: title.trim(), start, minutes });
	};
	const field = "h-6.5 min-w-0 rounded-lg bg-white/8 px-2 text-[12px] text-text outline-none [color-scheme:dark]";
	const button = "h-6 rounded-xl px-2.5 text-[11.5px] font-[650] disabled:opacity-40";

	return (
		<div className="mt-1.5 flex min-w-0 flex-col gap-1" data-no-drag>
			<input
				className={field}
				value={title}
				maxLength={300}
				placeholder={t("calendar.event.title")}
				aria-label={t("calendar.event.title")}
				onPointerDown={() => command("focus_island")}
				onChange={(e) => setTitle(e.target.value)}
				onKeyDown={(e) => e.key === "Enter" && save()}
			/>
			<div className="flex gap-1">
				<input
					type="datetime-local"
					className={`${field} flex-1`}
					value={start}
					aria-label={t("calendar.event.start")}
					onPointerDown={() => command("focus_island")}
					onChange={(e) => setStart(e.target.value)}
				/>
				<select
					className={field}
					value={minutes}
					aria-label={t("calendar.event.length")}
					onChange={(e) => setMinutes(Number(e.target.value))}
				>
					{[...new Set([...LENGTHS, minutes])]
						.sort((a, b) => a - b)
						.map((n) => (
							<option key={n} value={n} className="bg-black">
								{n} min
							</option>
						))}
				</select>
			</div>
			<div className="flex gap-1">
				<button type="button" className={`${button} bg-[#ff453a] text-white`} disabled={busy} onClick={save}>
					{t("calendar.event.save")}
				</button>
				<button type="button" className={`${button} bg-white/8`} disabled={busy} onClick={onDone}>
					{t("calendar.event.cancel")}
				</button>
				{event && (
					<button
						type="button"
						className={`${button} ml-auto ${armed ? "bg-[#ff453a] text-white" : "bg-white/8 text-[#ff453a]"}`}
						disabled={busy}
						onClick={() => (armed ? run("deleteEvent", { id: event.id }) : setArmed(true))}
					>
						{t(armed ? "calendar.event.confirm" : "calendar.event.delete")}
					</button>
				)}
			</div>
			{error && <span className="truncate text-[11px] text-[#ff453a]">{error}</span>}
		</div>
	);
}
