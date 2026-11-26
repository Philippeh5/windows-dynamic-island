import { describe, expect, test } from "bun:test";
import type { ModuleEntry, ModuleView } from "../../core/types";
import { statusLight } from "./statusLight";

const entry = (id: string, view: Partial<ModuleView>) => ({ module: { id }, view }) as unknown as ModuleEntry;
const music = entry("music", { active: true, accent: "#aa3366" });
const notification = entry("notifications", { active: true });
const water = entry("hydration", { attention: true });
const question = entry("ai-agents", { attention: true });

describe("statusLight", () => {
	test("nothing to say: the user's color", () => {
		expect(statusLight([entry("music", { active: false, accent: "#aa3366" })])).toBeUndefined();
	});

	test("most urgent first", () => {
		expect(statusLight([music, notification, water, question])).toEqual({ color: "#ff9f0a", blink: true });
		expect(statusLight([music, notification, water])).toEqual({ color: "#0a84ff", blink: true });
		expect(statusLight([music, notification])).toEqual({ color: "#0a84ff", blink: false });
		expect(statusLight([music])).toEqual({ color: "#aa3366", blink: false });
	});

	test("an approval waiting in the Poste module also turns it orange", () => {
		expect(statusLight([entry("plugin:poste-paseo:poste", { attention: true })])?.color).toBe("#ff9f0a");
	});
});
