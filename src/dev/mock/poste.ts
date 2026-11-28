import { POSTE_PROVIDER, type PosteEvent, type PosteState } from "../../core/poste";
import { defineMock, provider } from "./kit";

const inDays = (n: number, hour: number) => {
	const d = new Date();
	d.setDate(d.getDate() + n);
	d.setHours(hour, 0, 0, 0);
	return d.toISOString();
};

/** Made-up token counts, in proportion to `scale`. */
function sample(scale: number) {
	const n = (value: number) => Math.round(value * scale);
	return {
		tokensToday: { input: n(520), output: n(3100), cacheRead: n(380_000), cacheWrite: n(21_000), messages: 24 },
		usage: {
			daily: [12, 48, 91, 143, 271, 169, 4].map((day, i) => ({
				date: inDays(i - 6, 12).slice(0, 10),
				tokens: n(day * 10_000),
				responses: 10 + i,
			})),
			last5hTokens: n(94_000),
		},
	};
}

const state = provider<PosteState>(POSTE_PROVIDER, {
	configured: true,
	connected: true,
	quotas: [
		{
			name: "Claude",
			...sample(100),
			windows: [
				{ label: "5h", used: 44 },
				{ label: "wk", used: 58 },
			],
		},
		{ name: "Codex", windows: [{ label: "30d", used: 2 }], ...sample(3) },
		{ name: "Antigravity", windows: [{ label: "Gemini wk", used: 7 }], ...sample(5) },
		{ name: "OpenRouter", windows: [], ...sample(2) },
		{ name: "NVIDIA", windows: [], ...sample(1) },
	],
	announces: [],
	events: [{ id: "ev1", title: "Dentiste", start: inDays(14, 10), end: null }],
	agendaError: null,
	services: [
		{ id: "shop", group: "Shop", name: "frontend", running: true, restartable: true },
		{ id: "bot", group: "Bots", name: "trader", running: false, restartable: false },
	],
	projects: [
		{ name: "boutique", dir: "/p/boutique", host: "oracle" },
		{ name: "site", dir: "/p/site", host: "oracle" },
	],
	providers: [
		{ id: "claude", label: "Claude Code" },
		{ id: "codex", label: "Codex" },
	],
	approvals: [],
	sessions: [
		{
			host: "oracle",
			id: "t1",
			title: "claude · boutique",
			group: "waiting",
			status: "waiting",
			terminal: true,
			detail: "Which database?",
		},
		{ host: "oracle", id: "a1", title: "codex · site", group: "active", status: "running" },
	],
	taskLists: [
		{
			id: "L1",
			title: "Mes tâches",
			tasks: [
				{ id: "t1", title: "Appeler la banque", notes: "Demander le nouveau plafond de la carte.", due: "2026-11-20" },
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
const thread = [{ role: "assistant", text: "Hello, I am here." }];
let flowOn = true;
let note: { text: string; couleur: string } | null = null;

/** The pages the island reads from the post while they are open. */
function page({ what }: { what: string }) {
	if (what === "hermes") return { available: true, busy: false, error: null, messages: [...thread] };
	if (what === "postits") {
		const text =
			"# Boutique\n- [ ] Check the payment page\n- [x] Logo\n- [ ] **Course** [Options 101](https://example.test/a/very/long/address?x=1) · *free*";
		const shown = note ?? { text, couleur: "jaune" };
		return { postits: [{ path: "a.md", ...shown, sujets: ["boutique"], epingle: true }] };
	}
	if (what === "workflows") {
		return { workflows: [{ id: "digest", name: "Weekly digest", enabled: flowOn, running: false, last: null }] };
	}
	const types = ["trigger.cron", "obsidian.list", "llm.ask", "telegram.send"];
	return {
		id: "digest",
		name: "Weekly digest",
		description: "Every Sunday: gather, sum up, send.",
		nodes: types.map((type, i) => ({ id: String(i), type, x: i * 230, y: i % 2 ? 130 : 40, hint: i ? "" : "18:00" })),
		edges: [0, 1, 2].map((i) => ({ from: String(i), to: String(i + 1), label: "" })),
	};
}

export const poste = defineMock({
	label: "Poste",
	start: () => state.publish(),
	controls: [
		{
			kind: "button",
			label: "New question",
			run: () =>
				state.set((s) => ({
					...s,
					approvals: [
						{
							id: "q_1",
							title: "Claude · boutique",
							body: "Two choices before I continue.",
							danger: false,
							refuseOnly: false,
							questions: [
								{
									question: "Which database?",
									multiSelect: false,
									options: [
										{ label: "SQLite", description: "one file" },
										{ label: "Postgres", description: "server" },
									],
								},
								{
									question: "What next?",
									multiSelect: true,
									options: [
										{ label: "Tests", description: "" },
										{ label: "Docs", description: "" },
									],
								},
							],
						},
					],
				})),
		},
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
			editTask: (payload) => {
				const p = payload as { list: string; task: string; title: string; notes: string; due: string | null };
				state.set((s) => ({
					...s,
					taskLists: s.taskLists?.map((l) => ({
						...l,
						tasks: l.tasks.map((x) => (x.id === p.task ? { ...x, title: p.title, notes: p.notes, due: p.due } : x)),
					})),
				}));
			},
			completeTask: (payload) => drop(payload),
			deleteTask: (payload) => drop(payload),
			answer: () => state.set((s) => ({ ...s, approvals: (s.approvals ?? []).slice(1) })),
			send: () => ({ sent: true }),
			screen: () => ({ lines: ["⏺ Done.", "> "] }),
			fetch: (payload) => page(payload as { what: string }),
			say: (payload) => {
				thread.push({ role: "user", text: (payload as { text: string }).text }, { role: "assistant", text: "Noted." });
				return { accepted: true };
			},
			postit: () => null,
			checkPostit: () => null,
			editPostit: (payload) => {
				const p = payload as { text: string; color: string };
				note = { text: p.text, couleur: p.color };
			},
			toggleFlow: () => {
				flowOn = !flowOn;
				return null;
			},
			runFlow: () => null,
			restart: () => null,
			launch: (payload) => {
				const p = payload as { project: string; tool: string };
				const id = `new${Date.now()}`;
				const title = `${p.tool} · ${p.project.split("/").pop()}`;
				state.set((s) => ({
					...s,
					sessions: [
						...(s.sessions ?? []),
						{ host: "oracle", id, title, group: "idle", status: "idle", terminal: true },
					],
				}));
			},
			newTask: () => ({ id: "t1" }),
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
