import type { PosteQuestion } from "../../../../core/poste";

/** The answers to send, or `null` while a question has none. Several choices go as a list. */
export function buildAnswers(questions: PosteQuestion[], picked: string[][], typed: string[]) {
	const answers: Record<string, string | string[]> = {};
	for (const [i, q] of questions.entries()) {
		const list = [...(picked[i] ?? []), (typed[i] ?? "").trim()].filter(Boolean);
		if (!list.length) return null;
		answers[q.question] = q.multiSelect ? list : list[list.length - 1];
	}
	return answers;
}
