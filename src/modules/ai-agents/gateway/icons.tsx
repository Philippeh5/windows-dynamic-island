/** One request routed to two models. */
export function OpenRouterIcon({ size }: { size: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
			<path
				d="M3 12h5c4 0 4-6 9-6h3M8 12c4 0 4 6 9 6h3M17.5 3.5L20.5 6l-3 2.5M17.5 15.5l3 2.5-3 2.5"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** A chip with its pins. */
export function NvidiaIcon({ size }: { size: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
			<rect x="6" y="6" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="2" />
			<path
				d="M9.5 2.5v3M14.5 2.5v3M9.5 18.5v3M14.5 18.5v3M2.5 9.5h3M2.5 14.5h3M18.5 9.5h3M18.5 14.5h3"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
}
