import type { ModuleEntry } from "../../core/types";

export interface StatusLight {
	color: string;
	blink: boolean;
}

const QUESTION = "#ff9f0a";
const BLUE = "#0a84ff";
/** Modules that can be waiting on an answer: Claude and friends, and the Poste plugin's approvals. */
const AGENTS = ["ai-agents", "plugin:poste-paseo:poste"];

/**
 * The color the island takes, most urgent first: a question (blinking orange),
 * time to drink (blinking blue), a notification (blue), music (its cover's
 * color). `undefined`: the color chosen in the settings.
 */
export function statusLight(entries: ModuleEntry[]): StatusLight | undefined {
	const view = (id: string) => entries.find((e) => e.module.id === id)?.view;
	if (AGENTS.some((id) => view(id)?.attention)) return { color: QUESTION, blink: true };
	if (view("hydration")?.attention) return { color: BLUE, blink: true };
	if (view("notifications")?.active) return { color: BLUE, blink: false };
	const music = view("music");
	// Only a six-digit color can take the transparency suffix of the glow.
	if (music?.active && /^#[0-9a-f]{6}$/i.test(music.accent ?? ""))
		return { color: music.accent as string, blink: false };
	return undefined;
}
