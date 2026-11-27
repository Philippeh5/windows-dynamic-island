import { describe, expect, test } from "bun:test";
import { buildAnswers } from "./answers";

const questions = [
	{ question: "Next?", multiSelect: true, options: [] },
	{ question: "Where?", multiSelect: false, options: [] },
];

describe("buildAnswers", () => {
	test("several choices and a free answer together", () => {
		expect(buildAnswers(questions, [["A", "B"], []], ["and C", "Laptop"])).toEqual({
			"Next?": ["A", "B", "and C"],
			"Where?": "Laptop",
		});
	});

	test("every question needs an answer", () => {
		expect(buildAnswers(questions, [["A"], []], ["", " "])).toBeNull();
	});
});
