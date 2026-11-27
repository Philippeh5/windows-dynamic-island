export type NoteLine =
	| { kind: "text" | "title"; text: string }
	| { kind: "box"; text: string; done: boolean; index: number };

const BOX = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/;

/** A note's lines; checkboxes are numbered as the post counts them (those in code blocks don't count). */
export function noteLines(text: string): NoteLine[] {
	const lines: NoteLine[] = [];
	let index = 0;
	let code = false;
	for (const line of text.split("\n")) {
		if (line.startsWith("```")) {
			code = !code;
			continue;
		}
		const box = code ? null : BOX.exec(line);
		if (box) lines.push({ kind: "box", text: box[2].trim(), done: box[1] !== " ", index: index++ });
		else if (line.trim()) {
			const title = /^#+\s+(.*)$/.exec(line);
			lines.push(title ? { kind: "title", text: title[1] } : { kind: "text", text: line });
		}
	}
	return lines;
}
