import type { PosteApproval } from "../../../../core/poste";
import type { ModuleView } from "../../../../core/types";
import type { AgentSessionRef } from "../types";
import { AgentMark } from "./AgentMark";
import { PermissionPrompt } from "./PermissionPrompt";
import { PosteQuestion } from "./PosteQuestion";

const ORANGE = "#ff9f0a";
const WIDTH = 480;

/** One bubble per session waiting for the user: the post's first, then this computer's. */
export function sessionBubbles(
	approvals: PosteApproval[],
	sessions: AgentSessionRef[],
	now: number,
): NonNullable<ModuleView["bubbles"]> {
	const bySession = new Map<string, PosteApproval[]>();
	for (const item of approvals) {
		const key = item.session ?? item.id;
		bySession.set(key, [...(bySession.get(key) ?? []), item]);
	}
	const remote = [...bySession].map(([key, [first, ...others]]) => ({
		key: `poste:${key}`,
		color: ORANGE,
		width: WIDTH,
		label: first.title,
		icon: <AgentMark provider={first.provider} />,
		node: <PosteQuestion key={first.id} item={first} more={others.length} />,
	}));
	const local = sessions
		.filter((s) => s.session.permission && s.agent.decide)
		.map((item) => ({
			key: `local:${item.session.id}`,
			color: ORANGE,
			width: WIDTH,
			label: item.session.title,
			icon: <item.agent.Icon size={18} />,
			node: <PermissionPrompt key={item.session.permission?.id} item={item} now={now} more={0} />,
		}));
	return [...remote, ...local];
}
