import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { providerAction } from "./bridge";
import { POSTE_PROVIDER } from "./poste";

/** The last copy of each page, kept for the closed island and the next visit. */
const cache = new Map<string, unknown>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};

/** The last copy read of a page, without reading it. */
export function useCachedPage<T>(what: string, id = "") {
	return useSyncExternalStore(subscribe, () => cache.get(`${what}/${id}`) as T | undefined);
}

/** A page of the post, read when shown and then every few seconds while it stays on screen. */
export function usePostePage<T>(what: string, everyMs: number, id = "") {
	const data = useCachedPage<T>(what, id);
	const [error, setError] = useState("");

	const refresh = useCallback(
		() =>
			providerAction<T>(POSTE_PROVIDER, "fetch", { what, id })
				.then((page) => {
					cache.set(`${what}/${id}`, page);
					for (const listener of listeners) listener();
					setError("");
				})
				.catch((e) => setError(String(e))),
		[what, id],
	);
	useEffect(() => {
		refresh();
		const timer = window.setInterval(refresh, everyMs);
		return () => window.clearInterval(timer);
	}, [refresh, everyMs]);

	return { data, error, refresh };
}

/** One action on the post, with what the page shows meanwhile. */
export function usePosteAction() {
	const [busy, setBusy] = useState("");
	const [error, setError] = useState("");
	const run = useCallback(async (key: string, action: string, payload: Record<string, unknown>) => {
		setBusy(key);
		setError("");
		try {
			await providerAction(POSTE_PROVIDER, action, payload);
			return true;
		} catch (e) {
			setError(String(e));
			return false;
		} finally {
			setBusy("");
		}
	}, []);
	return { busy, error, run };
}
