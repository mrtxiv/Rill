import type { PresentationJob } from './jellyfin/presentation';

export type RillJob = {kind:'maintenance'; scheduledTime:number} | PresentationJob;

export interface Env {
  DB?: D1Database;
  RILL_SECRET?: string;
  TMDB_KEY?: string;
  D1_QUERY_BUDGET?: string;
  RILL_UPDATE_HOOK?: string;
  RILL_SETUP_TOKEN?: string;
  RILL_JOBS?: Queue<RillJob>;
}
