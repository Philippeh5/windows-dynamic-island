import { useLocale } from "../core/i18n";
import { useClock } from "../modules/ai-agents/common/format";

/** Time in the resting pill (Windows Island style). */
export function IdleClock() {
	const locale = useLocale();
	const now = useClock();
	const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(now);
	return (
		<div className="grid h-full place-items-center text-[14px] font-[650] tracking-[0.01em] tabular-nums">{time}</div>
	);
}
