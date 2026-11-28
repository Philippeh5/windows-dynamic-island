/**
 * Model gateways (OpenRouter, NVIDIA): nothing runs on this computer, so their
 * card only shows the tokens the post counted (see `core/posteData.ts`).
 */
import { useT } from "../../../core/i18n";
import type { AgentDefinition, AgentSnapshot } from "../common/types";
import { NvidiaIcon, OpenRouterIcon } from "./icons";

/** Unavailable (hidden) until the post reports it. */
function useGateway(): AgentSnapshot {
	const t = useT();
	return { available: false, sessions: [], limits: [], limitsHint: t("agents.noPlanLimits") };
}

export const openRouterAgent: AgentDefinition = {
	id: "openrouter",
	name: "OpenRouter",
	color: "#B58CFF",
	Icon: OpenRouterIcon,
	useAgent: useGateway,
	usageUrl: "https://openrouter.ai/activity",
};

export const nvidiaAgent: AgentDefinition = {
	id: "nvidia",
	name: "NVIDIA",
	color: "#76B900",
	Icon: NvidiaIcon,
	useAgent: useGateway,
};
