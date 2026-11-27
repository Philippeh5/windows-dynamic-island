import { POSTE_PROVIDER, type PosteEvent, type PosteState } from "../../core/poste";
import { defineMock, provider } from "./kit";

const inDays = (n: number, hour: number) => {
	const d = new Date();
	d.setDate(d.getDate() + n);
	d.setHours(hour, 0, 0, 0);
	return d.toISOString();
};

const state = provider<PosteState>(POSTE_PROVIDER, {
	configured: true,
	connected: true,
	quotas: [
		{
			name: "Claude",
			windows: [
				{ label: "5h", used: 44 },
				{ label: "wk", used: 58 },
			],
		},
		{ name: "Codex", windows: [{ label: "30d", used: 2 }] },
		{ name: "Antigravity", windows: [{ label: "Gemini wk", used: 7 }] },
	],
	announces: [],
	events: [{ id: "ev1", title: "Dentiste", start: inDays(14, 10), end: null }],
	agendaError: null,
	taskLists: [
		{
			id: "L1",
			title: "Mes tâches",
			tasks: [
				{ id: "t1", title: "Appeler la banque", due: "2026-11-20" },
				{ id: "t2", title: "Réviser", due: null },
			],
		},
		{ id: "L2", title: "Course", tasks: [{ id: "t3", title: "Pain", due: null }] },
	],
});

const drop = (payload: unknown) => {
	const p = payload as { task: string };
	state.set((s) => ({
		...s,
		taskLists: s.taskLists?.map((l) => ({ ...l, tasks: l.tasks.filter((t) => t.id !== p.task) })),
	}));
};

let count = 0;
export const poste = defineMock({
	label: "Poste",
	start: () => state.publish(),
	controls: [
		{
			kind: "button",
			label: "New announcement",
			run: () => {
				count += 1;
				state.set((s) => ({
					...s,
					announces: [
						...(s.announces ?? []),
						{ id: `n${count}`, at: new Date().toISOString(), text: `Tâche terminée n°${count}`, source: "poste" },
					],
				}));
			},
		},
	],
	actions: {
		[POSTE_PROVIDER]: {
			addTask: (payload) => {
				const p = payload as { list: string; title: string; due: string | null };
				state.set((s) => ({
					...s,
					taskLists: s.taskLists?.map((l) =>
						l.id === p.list ? { ...l, tasks: [...l.tasks, { id: `t${Date.now()}`, title: p.title, due: p.due }] } : l,
					),
				}));
			},
			completeTask: (payload) => drop(payload),
			deleteTask: (payload) => drop(payload),
			saveEvent: (payload) => {
				const p = payload as { id: string | null; title: string; start: string };
				const event: PosteEvent = { id: p.id ?? `ev${Date.now()}`, title: p.title, start: p.start, end: null };
				state.set((s) => ({ ...s, events: [...(s.events ?? []).filter((e) => e.id !== event.id), event] }));
			},
			deleteEvent: (payload) => {
				const { id } = payload as { id: string };
				state.set((s) => ({ ...s, events: (s.events ?? []).filter((e) => e.id !== id) }));
			},
		},
	},
});
