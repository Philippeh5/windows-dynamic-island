import { SparklesIcon } from "lucide-react";
import { useProvider } from "../../core/bridge";
import { useT } from "../../core/i18n";
import { POSTE_PROVIDER, type PosteState } from "../../core/poste";
import { posteLimits } from "../../core/posteData";
/**
 * AI Agents module — shows what coding agents are doing.
 *
 * Layout:
 *   common/   agent-agnostic types, formatting and UI (cards, session list…)
 *   claude/   Claude Code integration (one `AgentDefinition`)
 *   codex/    OpenAI Codex integration
 *   antigravity/  Google Antigravity (plan quota only)
 *
 * To support another agent, add a folder exporting an `AgentDefinition` and
 * append it to `agents` below.
 */
import { useSetting } from "../../core/settings";
import type { IslandModule, ModuleView } from "../../core/types";
import { antigravityAgent } from "./antigravity";
import { claudeAgent } from "./claude";
import { codexAgent } from "./codex";
import { AgentCompactLeft, AgentCompactRight } from "./common/components/AgentCompact";
import { AgentsPanel } from "./common/components/AgentsPanel";
import { AgentsSettings } from "./common/components/AgentsSettings";
import { PermissionPrompt } from "./common/components/PermissionPrompt";
import { PosteQuestion } from "./common/components/PosteQuestion";
import { PosteSessions } from "./common/components/PosteSessions";
import { StatusGlyph } from "./common/components/StatusGlyph";
import { useNow } from "./common/format";
import { pickPrimary } from "./common/primary";
import type { AgentDefinition, AgentSessionRef, AgentStatus } from "./common/types";
import { agentSettings } from "./settings";

const agents: AgentDefinition[] = [claudeAgent, codexAgent, antigravityAgent];

/** How long a finished turn keeps the island's attention. */
const DONE_VISIBLE_MS = 8_000;
const RECENT_MS = 30 * 60_000;
/** Height of the 7-day usage row. */
const USAGE_CHART = 74;
/** The permission request card plus the "Now" heading. */
const PERMISSION_PROMPT = 196;
/** The agent tabs, when more than one agent is installed. */
const AGENT_TABS = 34;
/** The tallest this page gets. */
const MAX_HEIGHT = 640;

const RANK: Record<AgentStatus, number> = { waiting: 0, limitsReset: 1, working: 2, done: 3, idle: 4 };
const PRIORITY: Record<AgentStatus, number> = { waiting: 90, limitsReset: 80, done: 70, working: 60, idle: 0 };

/** The first permission waiting for an answer. */
function AskingCard({ sessions, now }: { sessions: AgentSessionRef[]; now: number }) {
	const asking = sessions.filter((s) => s.session.permission && s.agent.decide);
	const first = asking[0];
	if (!first?.session.permission) return null;
	return <PermissionPrompt key={first.session.permission.id} item={first} now={now} more={asking.length - 1} />;
}

export const aiAgentsModule: IslandModule = {
	id: "ai-agents",
	title: "agents.title",
	settingsIcon: <SparklesIcon size={15} />,
	settings: Object.values(agentSettings),
	SettingsSection: () => <AgentsSettings agents={agents} />,
	settingsSectionCards: true,
	useView(): ModuleView {
		const t = useT();
		const peekOnWaiting = useSetting(agentSettings.peekOnWaiting);
		const peekOnDone = useSetting(agentSettings.peekOnDone);
		const peekOnLimitsReset = useSetting(agentSettings.peekOnLimitsReset);
		const peekOn: Partial<Record<AgentStatus, boolean>> = {
			waiting: peekOnWaiting,
			done: peekOnDone,
			limitsReset: peekOnLimitsReset,
		};

		// Static list → stable hook order.
		// biome-ignore lint/correctness/useHookAtTopLevel: the agent list is static, so the hook order is stable
		const local = agents.map((a) => a.useAgent());
		// Where the agents really run (the post), when this computer has no limits to show.
		const poste = useProvider<PosteState>(POSTE_PROVIDER);
		const all = local.map((snapshot, i) => {
			const limits = posteLimits(poste, agents[i].id);
			return limits.length ? { ...snapshot, available: true, limits } : snapshot;
		});
		// Agents not on this computer stay out of sight (Claude is always shown).
		const shown = agents.flatMap((agent, i) => (i === 0 || all[i].available ? [{ agent, snapshot: all[i] }] : []));
		const visible = shown.map((s) => s.agent);
		const snapshots = shown.map((s) => s.snapshot);

		const sessions: AgentSessionRef[] = visible
			.flatMap((agent, i) => snapshots[i].sessions.map((session) => ({ agent, session })))
			.sort((a, b) => RANK[a.session.status] - RANK[b.session.status] || b.session.lastEventAt - a.session.lastEventAt);

		const hasDone = sessions.some((s) => s.session.status === "done");
		const now = useNow(1000, hasDone);

		const isHot = ({ session: s }: AgentSessionRef) =>
			s.status === "working" ||
			s.status === "waiting" ||
			// Only present while fresh — the agent drops it.
			s.status === "limitsReset" ||
			(s.status === "done" && now - (s.finishedAt ?? 0) < DONE_VISIBLE_MS);

		const hot = sessions.find(isHot);
		const busyCount = sessions.filter((s) => s.session.status === "working" || s.session.status === "waiting").length;
		const recent = sessions
			.filter((s) => s.session.status !== "idle" || now - s.session.lastEventAt < RECENT_MS)
			.slice(0, 4);

		const primary = pickPrimary(visible, snapshots);
		// Questions and sessions of the post, where the agents run.
		const approvals = poste?.approvals ?? [];
		const remote = poste?.sessions ?? [];
		const question = approvals[0];
		const options = Math.max(0, ...(question?.questions.map((q) => q.options.length) ?? []));
		const posteHeight = (question ? 190 + options * 48 : 0) + (poste?.configured ? 40 + remote.length * 30 : 0);
		const asking = sessions.some((s) => s.session.permission && s.agent.decide);
		// The room the local agents need, without the island's own header.
		const usageHeight = asking
			? PERMISSION_PROMPT - 64 + Math.max(1, recent.length) * 30
			: 172 +
				Math.max(1, recent.length) * 30 +
				(snapshots.some((s) => s.usage?.daily.length) ? USAGE_CHART : 0) +
				(visible.length > 1 ? AGENT_TABS : 0);

		return {
			active: !!hot || !!question,
			priority: question ? PRIORITY.waiting : hot ? PRIORITY[hot.session.status] : 0,
			// A permission to answer: opening the island goes straight to it.
			attention: asking || !!question,
			icon: <StatusGlyph agent={hot?.agent ?? primary} status={hot?.session.status ?? "idle"} size={18} />,
			compact: question
				? {
						left: (
							<span className="pl-2 text-[13px] font-[650] whitespace-nowrap text-[#ff9f0a]">
								{t("agents.poste.asks")}
							</span>
						),
						right: <span className="max-w-40 truncate text-[12px] font-bold text-text-dim">{question.title}</span>,
						width: 340,
					}
				: hot && {
						left: <AgentCompactLeft hot={hot} busyCount={busyCount} />,
						right: <AgentCompactRight hot={hot} />,
						width: 340,
					},
			// A question or a permission waiting: answered from its bubble.
			alert: question
				? {
						color: "#ff9f0a",
						width: 480,
						node: <PosteQuestion key={question.id} item={question} more={approvals.length - 1} />,
					}
				: asking
					? { color: "#ff9f0a", width: 480, node: <AskingCard sessions={sessions} now={now} /> }
					: undefined,
			summary: {
				left: (
					<span className="flex items-center gap-2 pl-2 text-[13px] font-semibold whitespace-nowrap">
						<StatusGlyph agent={primary} status="idle" size={15} />
						{snapshots[0]?.limits.map((l) => `${l.label} ${Math.round(l.usedPct)}%`).join("  ·  ") || primary.name}
					</span>
				),
				right: (
					<span className="text-[12px] font-bold whitespace-nowrap text-text-dim">
						{t("agents.sessionCount", { n: busyCount })}
					</span>
				),
				width: 340,
			},
			expanded: (
				<div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto [scrollbar-width:none]" data-scroll>
					{question && (
						<div className="flex-none">
							<PosteQuestion key={question.id} item={question} more={approvals.length - 1} />
						</div>
					)}
					{poste?.configured && (
						<div className="flex-none">
							<PosteSessions sessions={remote} />
						</div>
					)}
					<div className="flex-none" style={{ height: usageHeight }}>
						<AgentsPanel agents={visible} snapshots={snapshots} sessions={recent} />
					</div>
				</div>
			),
			// Past this, the page scrolls.
			expandedSize: { width: 620, height: Math.min(MAX_HEIGHT, usageHeight + 64 + posteHeight) },
			// Peek when an agent needs you, just finished or its limits reset (each is a setting).
			activityKey:
				hot && peekOn[hot.session.status]
					? `${hot.agent.id}:${hot.session.id}:${hot.session.status}:${hot.session.finishedAt ?? hot.session.lastEventAt}`
					: undefined,
		};
	},
};
