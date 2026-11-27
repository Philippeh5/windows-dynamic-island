import { BellIcon } from "lucide-react";
/**
 * Windows notifications — WhatsApp, Teams, Outlook… mirrored into the
 * island. New ones arrive as alerts (through the activities module); this
 * module keeps the recent history. Backend: `src-tauri/src/providers/notifications/`.
 */
import { Badge } from "../../components/Glyph";
import { Marquee } from "../../components/Marquee";
import { useProvider } from "../../core/bridge";
import { POSTE_PROVIDER, type PosteState } from "../../core/poste";
import { posteNotifications } from "../../core/posteData";
import { useSetting } from "../../core/settings";
import type { IslandModule, ModuleView } from "../../core/types";
import { useNow } from "../ai-agents/common/format";
import { NotificationCard } from "./components/NotificationCard";
import { NotificationsPanel } from "./components/NotificationsPanel";
import { NotificationsSettings } from "./components/NotificationsSettings";
import { newsClearedAt, newsReadAt } from "./news";
import { NOTIFICATION_BLUE, NOTIFICATIONS_PROVIDER, type NotificationsState } from "./types";

/** Unread notifications this recent keep a spot in the compact island. */
const UNREAD_WINDOW_MS = 5 * 60_000;
const ROW = 52;

export const notificationsModule: IslandModule = {
	id: "notifications",
	title: "notifications.title",
	settingsIcon: <BellIcon size={14} />,
	SettingsSection: NotificationsSettings,
	useView(): ModuleView {
		const state = useProvider<NotificationsState>(NOTIFICATIONS_PROVIDER);
		const poste = useProvider<PosteState>(POSTE_PROVIDER);
		const readAt = useSetting(newsReadAt);
		const clearedAt = useSetting(newsClearedAt);
		const items = [...(state?.items ?? []), ...posteNotifications(poste, readAt, clearedAt)].sort(
			(a, b) => b.receivedAt - a.receivedAt,
		);
		const now = useNow(30_000, items.length > 0);
		const unread = items.filter((i) => !i.read);
		const latest = items[0];
		const recent = !!latest && !latest.read && now - latest.receivedAt < UNREAD_WINDOW_MS;

		return {
			active: recent,
			// An announcement from the post shows over the island for a moment.
			activityKey: recent && latest.id < 0 ? `poste:${latest.receivedAt}` : undefined,
			priority: 30,
			hidden: items.length === 0,
			accent: NOTIFICATION_BLUE,
			icon: <BellIcon size={14} color={NOTIFICATION_BLUE} />,
			compact: latest && {
				left: (
					<>
						<Badge icon="bell" image={latest.logo} color={NOTIFICATION_BLUE} size={24} radius={7} glyphSize={12} />
						<Marquee text={latest.title} className="max-w-55 text-[13px] font-semibold" />
					</>
				),
				right:
					unread.length > 1 ? (
						<span className="text-[12px] font-[650] text-[#0a84ff]">+{unread.length - 1}</span>
					) : null,
				width: 340,
			},
			alert: recent
				? { color: NOTIFICATION_BLUE, width: 320, node: <NotificationCard item={latest} unread={unread.length} /> }
				: undefined,
			expanded: <NotificationsPanel state={state} items={items} />,
			expandedSize: { width: 560, height: 66 + Math.min(Math.max(items.length, 1), 4) * ROW },
		};
	},
};
