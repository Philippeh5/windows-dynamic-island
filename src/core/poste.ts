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

export interface PosteTask {
	id: string;
	title: string;
	/** `YYYY-MM-DD`. */
	due: string | null;
}

export interface PosteTaskList {
	id: string;
	title: string;
	tasks: PosteTask[];
}

export interface PosteQuestion {
	question: string;
	multiSelect: boolean;
	options: { label: string; description: string }[];
}

/** A question or a permission an agent waits on. */
export interface PosteApproval {
	id: string;
	title: string;
	/** What the agent wrote before asking. */
	body: string;
	danger: boolean;
	/** Only the post itself may allow this one. */
	refuseOnly: boolean;
	questions: PosteQuestion[];
}

export interface PosteSession {
	host: string;
	id: string;
	title: string;
	/** `active`, `waiting`, `idle`, `error`… */
	group: string;
	status: string;
	terminal?: boolean;
	detail?: string;
}

export interface PosteState {
	configured: boolean;
	connected: boolean;
	quotas: PosteQuota[] | null;
	announces: PosteAnnounce[] | null;
	events: PosteEvent[] | null;
	agendaError: string | null;
	/** The user's own to-do lists (Google Tasks). */
	taskLists?: PosteTaskList[] | null;
	tasksError?: string | null;
	approvals?: PosteApproval[] | null;
	sessions?: PosteSession[] | null;
}
