import { type InputHTMLAttributes, type TextareaHTMLAttributes, useEffect, useState } from "react";
import { command } from "../../core/bridge";
import { cn } from "../../core/cn";
import { useIsland } from "../../core/island";

/** Shared pieces of the pages that talk to the post. */
export const field = "h-7 min-w-0 rounded-lg bg-white/8 px-2 text-[12px] text-text outline-none [color-scheme:dark]";
export const button =
	"h-7 flex-none rounded-lg bg-white/12 px-3 text-[12px] font-[650] hover:bg-white/18 disabled:opacity-40";

/** A text field that takes the keyboard and keeps the island open while typing. */
function useTyping(reason: string) {
	const { keepOpen } = useIsland();
	useEffect(() => () => keepOpen(false, reason), [keepOpen, reason]);
	return {
		onPointerDown: () => command("focus_island"),
		onFocus: () => keepOpen(true, reason),
		onBlur: () => keepOpen(false, reason),
	};
}

export function Input({ reason, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { reason: string }) {
	return <input {...props} {...useTyping(reason)} className={cn(field, className)} />;
}

export function Area({
	reason,
	className,
	...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { reason: string }) {
	return <textarea {...props} {...useTyping(reason)} className={cn(field, "h-auto resize-none py-1.5", className)} />;
}

/** A button that asks to be pressed twice. */
export function Confirm({
	label,
	confirm,
	disabled,
	onConfirm,
}: {
	label: string;
	confirm: string;
	disabled?: boolean;
	onConfirm: () => void;
}) {
	const [armed, setArmed] = useState(false);
	useEffect(() => {
		if (!armed) return;
		const timer = window.setTimeout(() => setArmed(false), 4000);
		return () => window.clearTimeout(timer);
	}, [armed]);
	return (
		<button
			type="button"
			className={cn(button, armed && "bg-[#ff9f0a] text-black hover:bg-[#ff9f0a]")}
			disabled={disabled}
			onClick={() => {
				setArmed(!armed);
				if (armed) onConfirm();
			}}
		>
			{armed ? confirm : label}
		</button>
	);
}
