import { AntigravityIcon } from "../../antigravity/AntigravityIcon";
import { ClaudeIcon } from "../../claude/ClaudeIcon";
import { CodexIcon } from "../../codex/CodexIcon";
import { NvidiaIcon, OpenRouterIcon } from "../../gateway/icons";

/** A two-letter tile, for agents without a drawing of their own. */
function Letters({ text, size }: { text: string; size: number }) {
	return (
		<span className="font-bold leading-none" style={{ fontSize: size * 0.68 }}>
			{text}
		</span>
	);
}
const OpenCode = ({ size }: { size: number }) => <Letters text="OC" size={size} />;
const FreeBuff = ({ size }: { size: number }) => <Letters text="FB" size={size} />;
const Unknown = ({ size }: { size: number }) => <Letters text="AI" size={size} />;

const MARKS: Record<string, { Icon: (props: { size: number }) => React.ReactNode; color: string }> = {
	claude: { Icon: ClaudeIcon, color: "#D97757" },
	codex: { Icon: CodexIcon, color: "#8B9CFF" },
	antigravity: { Icon: AntigravityIcon, color: "#388BFD" },
	agy: { Icon: AntigravityIcon, color: "#388BFD" },
	"claude-openrouter": { Icon: OpenRouterIcon, color: "#B58CFF" },
	"claude-nvidia": { Icon: NvidiaIcon, color: "#76B900" },
	opencode: { Icon: OpenCode, color: "#F5F5F4" },
	freebuff: { Icon: FreeBuff, color: "#2DD4BF" },
};

/** The picture of an agent of the post, from its provider's name. */
export function AgentMark({ provider, size = 18 }: { provider?: string; size?: number }) {
	const { Icon, color } = MARKS[provider ?? "claude"] ?? { Icon: Unknown, color: "#F5F5F4" };
	return (
		<span className="grid place-items-center" style={{ color }}>
			<Icon size={size} />
		</span>
	);
}
