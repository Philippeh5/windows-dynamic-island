export type Piece =
	| { kind: "text" | "bold" | "italic" | "code"; text: string }
	| { kind: "link"; text: string; url: string };

// A Markdown link, bold, code, italic (a "*" or "_" pair around words), or a bare address.
const MARK =
	/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|(?<![\w*])\*(?!\s)([^*]+?)(?<!\s)\*(?![\w*])|(https?:\/\/[^\s)]+)/g;

const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").split(/[/?#]/)[0];

/** A line of a note, cut into what is shown plain, styled or as a link. */
export function inline(text: string): Piece[] {
	const pieces: Piece[] = [];
	let done = 0;
	for (const m of text.matchAll(MARK)) {
		if (m.index > done) pieces.push({ kind: "text", text: text.slice(done, m.index) });
		const [all, label, url, bold, code, italic, bare] = m;
		if (label) pieces.push({ kind: "link", text: label, url });
		else if (bold) pieces.push({ kind: "bold", text: bold });
		else if (code) pieces.push({ kind: "code", text: code });
		else if (italic) pieces.push({ kind: "italic", text: italic });
		else pieces.push({ kind: "link", text: host(bare), url: bare });
		done = m.index + all.length;
	}
	if (done < text.length) pieces.push({ kind: "text", text: text.slice(done) });
	return pieces;
}

/** The same line without its marks, for the closed island. */
export const plain = (text: string) =>
	inline(text)
		.map((p) => p.text)
		.join("");
