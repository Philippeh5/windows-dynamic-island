import type { IslandModule } from "../core/types";
import { actionsModule } from "./actions";
import { activitiesModule } from "./activities";
import { aiAgentsModule } from "./ai-agents";
import { askModule } from "./ask";
import { clipboardModule } from "./clipboard";
import { clockModule } from "./clock";
import { findModule } from "./find";
import { githubModule } from "./github";
import { hermesModule } from "./hermes";
import { hydrationModule } from "./hydration";
import { monitorModule } from "./monitor";
import { musicModule } from "./music";
import { notificationsModule } from "./notifications";
import { postitsModule } from "./postits";
import { shelfModule } from "./shelf";
import { tasksModule } from "./tasks";
import { workflowsModule } from "./workflows";

/**
 * Every module the island knows about, in tab order.
 *
 * Each module is a self-contained folder (`src/modules/<name>/`) with its own
 * components, hooks and CSS, exporting an `IslandModule` (see `core/types.ts`).
 * If it needs data from the OS, add a matching provider in
 * `src-tauri/src/providers/<name>/`.
 */
export const modules: IslandModule[] = [
	musicModule,
	aiAgentsModule,
	askModule,
	findModule,
	notificationsModule,
	activitiesModule,
	shelfModule,
	clipboardModule,
	githubModule,
	hydrationModule,
	monitorModule,
	clockModule,
	tasksModule,
	hermesModule,
	postitsModule,
	workflowsModule,
	actionsModule,
];
