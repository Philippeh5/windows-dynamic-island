import { describe, expect, test } from "bun:test";
import { inline, plain } from "./inline";

describe("inline", () => {
	test("links show their title, marks disappear", () => {
		expect(inline("**Freqtrade** — [MIT (2024)](https://ocw.mit.edu/a-b) · *gratuit* `x_y`")).toEqual([
			{ kind: "bold", text: "Freqtrade" },
			{ kind: "text", text: " — " },
			{ kind: "link", text: "MIT (2024)", url: "https://ocw.mit.edu/a-b" },
			{ kind: "text", text: " · " },
			{ kind: "italic", text: "gratuit" },
			{ kind: "text", text: " " },
			{ kind: "code", text: "x_y" },
		]);
	});

	test("a bare address shows its site; lone stars stay", () => {
		expect(plain("voir https://www.exemple.test/long/chemin?x=1 et 2 * 3 * 4")).toBe("voir exemple.test et 2 * 3 * 4");
	});
});
