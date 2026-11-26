/** Module tabs shown at once before the bar is measured; the rest slide in as the selection nears an edge. */
export const MAX_VISIBLE_TABS = 6;
/** A closed tab with its gap, and the rest of the bar: its buttons (and the open tab's name). */
const TAB = 36;
const reserved = (iconsOnly: boolean) => (iconsOnly ? 250 : 330);

/** As many tabs as the bar has room for, never fewer than the default. */
export function visibleTabs(barWidth: number, iconsOnly: boolean): number {
	return Math.max(MAX_VISIBLE_TABS, Math.floor((barWidth - reserved(iconsOnly)) / TAB));
}

/** The bar width that shows `count` tabs: an open island is never narrower than that. */
export const barWidthFor = (count: number, iconsOnly: boolean) => reserved(iconsOnly) + count * TAB;
/** Tabs kept visible past the selected one, on each side, while more are hidden. */
const MARGIN = 2;

/**
 * First visible tab index after selecting `selected` (-1: none of the module
 * tabs, e.g. the launcher). The window only moves as far as needed to keep
 * `MARGIN` tabs beside the selection, so reaching the second-to-last visible
 * tab slides everything one step and reveals the next ones.
 */
export function tabWindow(start: number, total: number, selected: number, size = MAX_VISIBLE_TABS): number {
	const maxStart = Math.max(0, total - size);
	let first = Math.min(Math.max(start, 0), maxStart);
	if (selected < 0 || total <= size) return first;
	const margin = Math.min(MARGIN, Math.floor((size - 1) / 2));
	if (selected > first + size - 1 - margin) first = selected - (size - 1 - margin);
	if (selected < first + margin) first = selected - margin;
	return Math.min(Math.max(first, 0), maxStart);
}
