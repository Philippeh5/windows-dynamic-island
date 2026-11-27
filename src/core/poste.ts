/**
 * The user's command post. Backend: `src-tauri/src/providers/poste.rs`.
 * Its data shows up in the island's own pages: limits in AI Agents,
 * announcements in Notifications, events in the calendar.
 */
export const POSTE_PROVIDER = "poste";

export interface PosteQuota {
	name: string;
	windows: { label: string; used: number; resetsAt?: string | null }[];
}

export interface PosteAnnounce {
	id: string;
	at: string;
	text: string;
	source?: string;
}

export interface PosteEvent {
	id: string;
	title: string;
	/** ISO date or date-time. */
	start: string;
	end: string | null;
	allDay?: boolean;
	status?: string;
}

export interface PosteState {
	configured: boolean;
	connected: boolean;
	quotas: PosteQuota[] | null;
	announces: PosteAnnounce[] | null;
	events: PosteEvent[] | null;
	agendaError: string | null;
}
