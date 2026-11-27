import type { SettingDef } from "../../core/settings";

/** Announcements up to this time (ms) were looked at, or cleared away. */
export const newsReadAt: SettingDef<number> = { key: "poste.newsReadAt", label: "notifications.title", default: 0 };
export const newsClearedAt: SettingDef<number> = {
	key: "poste.newsClearedAt",
	label: "notifications.title",
	default: 0,
};
