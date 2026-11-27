import { useLocale, useT } from "../../../core/i18n";
import type { CalEvent } from "../types";
import type { upcomingDays } from "../upcoming";

/** The events to come, day by day. */
export function Upcoming({
	days,
	colors,
	onOpen,
}: {
	days: ReturnType<typeof upcomingDays>;
	colors: Map<string, string>;
	onOpen: (event: CalEvent) => void;
}) {
	const t = useT();
	const locale = useLocale();
	const dayName = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });
	const hour = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });
	return (
		<div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]" data-scroll>
			{days.length === 0 && <p className="px-2 py-1 text-[12px] text-text-faint">{t("calendar.nothing")}</p>}
			{days.map(({ day, events }) => (
				<section key={day} className="mb-2">
					<h3 className="mb-1 font-[Georgia,serif] text-[14px] font-bold first-letter:uppercase">
						{dayName.format(day)}
					</h3>
					<ul className="flex list-none flex-col gap-0.75">
						{events.map((e) => (
							<li key={e.id}>
								<button
									type="button"
									className="flex w-full items-center gap-2.5 rounded-lg bg-white/6 py-1.25 pr-2 pl-2.5 text-left shadow-[inset_3px_0_0_var(--cal-color)] hover:bg-white/10"
									style={{ "--cal-color": colors.get(e.calendar) ?? "#8E8E93" } as React.CSSProperties}
									title={[e.title, e.location].filter(Boolean).join("\n")}
									onClick={() => onOpen(e)}
								>
									<span className="w-21 flex-none text-[11.5px] font-[650] text-text-dim tabular-nums">
										{e.allDay ? t("calendar.allDay") : `${hour.format(e.start)}`}
									</span>
									<span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">
										{e.title || t("calendar.untitled")}
									</span>
								</button>
							</li>
						))}
					</ul>
				</section>
			))}
		</div>
	);
}
