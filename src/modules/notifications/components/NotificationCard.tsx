import type { NotificationItem } from "../types";

/** The newest notification, read from its bubble. */
export function NotificationCard({ item, unread }: { item: NotificationItem; unread: number }) {
	return (
		<div className="flex flex-col gap-0.5 px-1.5 py-1">
			<div className="flex items-center justify-between text-[11px] font-semibold text-text-faint">
				<span className="truncate">{item.app}</span>
				{unread > 1 && <span className="text-[#0a84ff]">+{unread - 1}</span>}
			</div>
			<span className="line-clamp-4 text-[13px] font-semibold">{item.title}</span>
			{item.body && <span className="line-clamp-3 text-[12px] text-text-dim">{item.body}</span>}
		</div>
	);
}
