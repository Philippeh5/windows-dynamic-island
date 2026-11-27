import { command } from "../../core/bridge";
import { inline } from "./inline";

/** A note's line, with its bold, italics, code and links. */
export function NoteText({ text }: { text: string }) {
	return inline(text).map((piece, i) => {
		const key = `${i}:${piece.text}`;
		if (piece.kind === "bold") return <strong key={key}>{piece.text}</strong>;
		if (piece.kind === "italic") return <em key={key}>{piece.text}</em>;
		if (piece.kind === "code") {
			return (
				<code key={key} className="rounded bg-black/10 px-1 font-mono text-[0.9em]">
					{piece.text}
				</code>
			);
		}
		if (piece.kind === "link") {
			return (
				<button
					type="button"
					key={key}
					className="inline text-left font-semibold text-[#0a4fa0] underline underline-offset-2"
					title={piece.url}
					onClick={(e) => {
						e.preventDefault();
						if (piece.url.startsWith("https://")) command("open_external", { url: piece.url });
					}}
				>
					{piece.text}
				</button>
			);
		}
		return <span key={key}>{piece.text}</span>;
	});
}
