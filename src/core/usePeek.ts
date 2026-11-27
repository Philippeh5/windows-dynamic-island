import { useCallback, useEffect, useRef, useState } from "react";
import type { ModuleEntry } from "./types";

const PEEK_DURATION = 3800;
/** How long news scrolls in the closed island before it goes back to the page looked at. */
export const NEWS_DURATION = 7000;

/**
 * News from a module (its `activityKey` changes) takes the closed island for a
 * moment; `peek` shows a module's page, on demand.
 */
export function usePeek(entries: ModuleEntry[]) {
	const [peekId, setPeekId] = useState<string | null>(null);
	const timer = useRef<number | undefined>(undefined);

	const peek = useCallback((moduleId: string) => {
		setPeekId(moduleId);
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => setPeekId(null), PEEK_DURATION);
	}, []);

	const [newsId, setNewsId] = useState<string | null>(null);
	const newsTimer = useRef<number | undefined>(undefined);
	const announce = useCallback((moduleId: string) => {
		setNewsId(moduleId);
		window.clearTimeout(newsTimer.current);
		newsTimer.current = window.setTimeout(() => setNewsId(null), NEWS_DURATION);
	}, []);

	/** The island was opened or closed on purpose: nothing temporary stays. */
	const endPeek = useCallback(() => {
		window.clearTimeout(timer.current);
		window.clearTimeout(newsTimer.current);
		setPeekId(null);
		setNewsId(null);
	}, []);

	useEffect(
		() => () => {
			window.clearTimeout(timer.current);
			window.clearTimeout(newsTimer.current);
		},
		[],
	);

	const lastKeys = useRef(new Map<string, string | undefined>());
	const keySignature = entries.map((e) => `${e.module.id}=${e.view.activityKey ?? ""}`).join("|");
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs only when an activity key changes, not on every new entries array
	useEffect(() => {
		for (const { module, view } of entries) {
			const seen = lastKeys.current.has(module.id);
			const prev = lastKeys.current.get(module.id);
			lastKeys.current.set(module.id, view.activityKey);
			if (seen && view.activityKey && view.activityKey !== prev) announce(module.id);
		}
	}, [keySignature]);

	return { peekId, newsId, peek, endPeek };
}
