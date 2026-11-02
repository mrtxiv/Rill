export type TrackerName = 'trakt' | 'simkl' | 'mal' | 'anilist' | 'mdblist' | 'publicmetadb';
export type MetaProvider = 'off' | 'tmdb' | 'tvdb' | 'cinemeta' | 'tvmaze';
export type AnimeProvider = 'off' | 'mal' | 'anilist' | 'kitsu' | 'tmdb' | 'tvdb';

export interface TraktAuth { clientId: string; clientSecret?: string; accessToken: string; refreshToken?: string; expiresAt?: number; username?: string }
export interface SimklAuth { clientId: string; accessToken: string }
export interface MalAuth { clientId: string; clientSecret?: string; accessToken: string; refreshToken?: string; expiresAt?: number }
export interface AnilistAuth { accessToken: string; userId?: number }

export interface CatalogToggle { id: string; type: 'movie' | 'series' | 'anime'; enabled: boolean; name?: string }
export interface JellyfinProfile { id: string; name: string; sharesHistory: boolean; avatar?: string; ageCap?: string; catalogs?: string[] }
export type TileShape = 'poster' | 'landscape' | 'square';
export type CollectionSource =
  | { kind: 'catalog'; id: string; type: 'movie' | 'series' | 'anime'; genre?: string }
  | { kind: 'person'; id: number; name: string }
  | { kind: 'franchise'; id: number; name: string }
  | { kind: 'studio'; id: number; name: string; type: 'movie' | 'series' }
  | { kind: 'network'; id: number; name: string }
  | { kind: 'discover'; type: 'movie' | 'series'; params: Record<string, string> };
export interface CollectionFolder { id: string; name: string; shape?: TileShape; cover?: string; backdrop?: string; logo?: string; sources: CollectionSource[] }
export type GeneratorKind = 'genres' | 'decades' | 'people' | 'studios' | 'networks' | 'franchises';
export interface CollectionGenerator { id: string; kind: GeneratorKind; shape?: TileShape; limit?: number; catalog?: { id: string; type: 'movie' | 'series' | 'anime' }; type?: 'movie' | 'series'; ids?: number[] }
export interface JellyfinCollection { id: string; name: string; description?: string; backdrop?: string; cover?: string; coverShape?: TileShape; shape?: TileShape; profiles?: string[]; generators?: CollectionGenerator[]; folders: CollectionFolder[] }
export interface CustomCatalog {
  id: string;
  name: string;
  type: 'movie' | 'series' | 'anime';
  provider: 'tmdb' | 'tvdb' | 'mal' | 'anilist' | 'movielens' | 'simkl' | 'merged';
  params: Record<string, string | number | boolean | string[]>;
  sources?: Array<{ id: string; type: 'movie' | 'series' | 'anime';genre?:string }>;
}
export interface RecommendationSettings {
  aiSearch?:boolean;
  sources:'primary'|'simkl'|'mdblist'|'both';
  enabled:boolean; provider:'gemini'|'openrouter'; apiKey:string; model:string;
  webSearch:boolean; refreshHours:number; order:'suggested'|'popular'|'acclaimed'|'balanced';
  minVotes:number; reasoning:'minimal'|'low'|'medium'|'high'; staleDays:number;
  stalledWeight:'ignore'|'note'|'mild'|'dislike';
}

export interface RillConfig {
  v: 1;
  installationKey?: string;
  revision?: number;
  name: string;
  language: string;
  providers: { movie: MetaProvider; series: MetaProvider; anime: AnimeProvider };
  artwork: { posters: Array<'tmdb' | 'fanart' | 'tvdb' | 'rpdb' | 'metahub'>; backgrounds: Array<'tmdb' | 'fanart' | 'tvdb' | 'metahub'>; logos: Array<'fanart' | 'tmdb' | 'tvdb' | 'metahub'> };
  keys: { tmdb?: string; tvdb?: string; fanart?: string; rpdb?: string; publicmetadb?: string; mdblist?: string };
  addons: { catalog: string[]; meta: string[]; stream: string[]; subtitle: string[] };
  catalogs: CatalogToggle[];
  lists: { mdblist: string[]; trakt: string[]; publicmetadb?: string[]; publicmetadbPicks?: string[]; tvdb?: string[]; tmdbCollections?:string[]; letterboxd?: string[]; flixpatrol?: string[] };
  customCatalogs?: CustomCatalog[];
  movieLens?: { username: string; password: string; syncRatings?: boolean };
  recommendations?: RecommendationSettings;
  trackers: { primary: TrackerName | 'off'; scrobbleTo: TrackerName[]; media?: Partial<Record<TrackerName, { movie?: boolean; series?: boolean }>>; trakt?: TraktAuth; simkl?: SimklAuth; mal?: MalAuth; anilist?: AnilistAuth };
  ageCap: string;
  advanced: boolean;
  jellyfin: { username: string; password: string; maxSources: number; torrentServer?: string; home: Array<'resume' | 'nextup' | 'latest' | 'upcoming'>; profiles?: JellyfinProfile[]; collections?: JellyfinCollection[] };
  search: { providers: Array<'tmdb' | 'tvdb' | 'mal' | 'anilist' | 'kitsu' | 'cinemeta'>; includeAdult: boolean };
}

export const DEFAULT_CONFIG: RillConfig = {
  v: 1,
  name: 'Rill',
  language: 'en-US',
  providers: { movie: 'off', series: 'off', anime: 'off' },
  artwork: { posters: [], backgrounds: [], logos: [] },
  keys: {},
  addons: { catalog: [], meta: [], stream: [], subtitle: [] },
  catalogs: [],
  lists: { mdblist: [], trakt: [], publicmetadb: [], publicmetadbPicks: [] },
  trackers: { primary: 'off', scrobbleTo: [], media: Object.fromEntries(['trakt','simkl','mdblist','publicmetadb','mal','anilist'].map(name => [name, { movie: true, series: true }])) },
  ageCap: '',
  advanced: false,
  jellyfin: { username: 'rill', password: '', profiles: [], collections: [], maxSources: 30, home: ['resume', 'nextup', 'latest', 'upcoming'] },
  search: { providers: [], includeAdult: false },
  recommendations:{sources:'both',enabled:false,provider:'gemini',apiKey:'',model:'',webSearch:false,refreshHours:24,order:'balanced',minVotes:100,reasoning:'low',staleDays:180,stalledWeight:'note'},
};

export function normalizeConfig(input: unknown): RillConfig {
  const src = (input && typeof input === 'object' ? input : {}) as Partial<RillConfig>;
  const cfg: RillConfig = structuredClone(DEFAULT_CONFIG);
  if (typeof src.installationKey === 'string' && /^[a-f0-9-]{32,64}$/i.test(src.installationKey)) cfg.installationKey=src.installationKey;
  if (typeof src.revision==='number' && Number.isSafeInteger(src.revision) && src.revision>=0) cfg.revision=src.revision;
  cfg.name = str(src.name, cfg.name);
  cfg.language = str(src.language, cfg.language);
  cfg.providers = { ...cfg.providers, ...(src.providers ?? {}) };
  cfg.artwork = { ...cfg.artwork, ...(src.artwork ?? {}) };
  cfg.keys = { ...(src.keys ?? {}) };
  cfg.addons = { catalog: arr(src.addons?.catalog), meta: arr(src.addons?.meta), stream: arr(src.addons?.stream), subtitle: arr(src.addons?.subtitle) };
  cfg.catalogs = Array.isArray(src.catalogs) ? src.catalogs.filter((c) => c && typeof c.id === 'string') : [];
  cfg.lists = { mdblist: arr(src.lists?.mdblist), trakt: arr(src.lists?.trakt), publicmetadb: arr(src.lists?.publicmetadb), publicmetadbPicks: arr(src.lists?.publicmetadbPicks) };
  cfg.lists.tvdb = arr(src.lists?.tvdb);
  cfg.lists.tmdbCollections=arr(src.lists?.tmdbCollections);
  cfg.lists.letterboxd = arr(src.lists?.letterboxd);
  cfg.lists.flixpatrol = arr(src.lists?.flixpatrol);
  cfg.customCatalogs = (Array.isArray(src.customCatalogs) ? src.customCatalogs : []).filter(c => c && /^[a-zA-Z0-9_-]{1,80}$/.test(c.id) && typeof c.name === 'string' && ['movie','series','anime'].includes(c.type) && ['tmdb','tvdb','mal','anilist','movielens','simkl','merged'].includes(c.provider)).map(c => ({
    id:c.id, name:c.name.trim().slice(0,150), type:c.type, provider:c.provider,
    params:Object.fromEntries(Object.entries(c.params ?? {}).filter(([k,v]) => /^[a-zA-Z0-9_.]+$/.test(k) && (typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number' && Number.isFinite(v) || Array.isArray(v) && v.every(x=>typeof x==='string')))),
    sources:(Array.isArray(c.sources) ? c.sources : []).filter(s => s && typeof s.id==='string' && ['movie','series','anime'].includes(s.type) && !s.id.startsWith('merged.')).slice(0,10),
  }));
  if (src.movieLens && typeof src.movieLens.username==='string' && typeof src.movieLens.password==='string') cfg.movieLens={username:src.movieLens.username.trim(),password:src.movieLens.password,syncRatings:src.movieLens.syncRatings===true};
  const rec=src.recommendations;
  if(rec)cfg.recommendations={...DEFAULT_CONFIG.recommendations!,aiSearch:rec.aiSearch===true,sources:['primary','simkl','mdblist','both'].includes(rec.sources)?rec.sources:'both',enabled:rec.enabled===true,provider:rec.provider==='openrouter'?'openrouter':'gemini',apiKey:typeof rec.apiKey==='string'?rec.apiKey.trim():'',model:typeof rec.model==='string'?rec.model.trim():'',webSearch:rec.webSearch===true,refreshHours:[6,12,24].includes(Number(rec.refreshHours))?Number(rec.refreshHours):24,order:['suggested','popular','acclaimed','balanced'].includes(rec.order)?rec.order:'balanced',minVotes:Math.max(0,Number.isFinite(Number(rec.minVotes))?Number(rec.minVotes):100),reasoning:['minimal','low','medium','high'].includes(rec.reasoning)?rec.reasoning:'low',staleDays:Math.max(7,Number(rec.staleDays)||180),stalledWeight:['ignore','note','mild','dislike'].includes(rec.stalledWeight)?rec.stalledWeight:'note'};
  cfg.trackers = { ...cfg.trackers, ...(src.trackers ?? {}) };
  cfg.trackers.media = Object.fromEntries(['trakt','simkl','mdblist','publicmetadb','mal','anilist'].map(name => [name, { movie: true, series: true, ...src.trackers?.media?.[name as TrackerName] }]));
  cfg.trackers.scrobbleTo = arr(cfg.trackers.scrobbleTo) as TrackerName[];
  cfg.ageCap = str(src.ageCap, '');
  cfg.advanced = src.advanced === true;
  cfg.jellyfin = { ...cfg.jellyfin, ...(src.jellyfin ?? {}) };
  const seenProfiles = new Set<string>();
  const seenNames = new Set<string>([cfg.jellyfin.username.toLowerCase()]);
  cfg.jellyfin.profiles = (Array.isArray(src.jellyfin?.profiles) ? src.jellyfin.profiles : []).filter(p => {
    if (!p || typeof p.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(p.id) || typeof p.name !== 'string' || !p.name.trim() || seenProfiles.has(p.id) || seenNames.has(p.name.trim().toLowerCase())) return false;
    seenProfiles.add(p.id); seenNames.add(p.name.trim().toLowerCase()); return true;
  }).map(p => ({ id:p.id,name:p.name.trim(),sharesHistory:p.sharesHistory === true,avatar:typeof p.avatar === 'string' && /^https?:\/\//i.test(p.avatar) ? p.avatar : undefined,ageCap:typeof p.ageCap === 'string' ? p.ageCap : undefined,catalogs:arr(p.catalogs) }));
  cfg.jellyfin.maxSources = Math.max(1, Math.min(200, Number(cfg.jellyfin.maxSources) || 30));
  const torrentServer = url(src.jellyfin?.torrentServer)?.replace(/\/+$/, '');
  if (torrentServer && /^https?:\/\/[^/@?#\s]+(\/[^?#\s]*)?$/i.test(torrentServer)) cfg.jellyfin.torrentServer = torrentServer;
  else delete cfg.jellyfin.torrentServer;
  cfg.jellyfin.collections = collectionsOf(src.jellyfin?.collections, seenProfiles);
  cfg.search = { ...cfg.search, ...(src.search ?? {}) };
  return cfg;
}

const SLUG = /^[a-zA-Z0-9_-]{1,64}$/;
function url(v: unknown): string | undefined { return typeof v === 'string' && /^https?:\/\//i.test(v.trim()) ? v.trim() : undefined; }
const SHAPES = new Set<string>(['poster', 'landscape', 'square']);
const GENERATORS = new Set<string>(['genres', 'decades', 'people', 'studios', 'networks', 'franchises']);
function shapeOf(v: unknown): TileShape | undefined { return typeof v === 'string' && SHAPES.has(v) ? (v as TileShape) : undefined; }
function mediaOf(v: unknown): 'movie' | 'series' | undefined { return v === 'movie' || v === 'series' ? v : undefined; }
function posInt(v: unknown): number | undefined { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : undefined; }
function nameOf(v: unknown): string { return typeof v === 'string' ? v.trim().slice(0, 120) : ''; }
export function sourceOf(s: Record<string, unknown> | null | undefined): CollectionSource | null {
  if (!s) return null;
  const id = posInt(s.id);
  if (s.kind === 'person') return id ? { kind: 'person', id, name: nameOf(s.name) } : null;
  if (s.kind === 'franchise') return id ? { kind: 'franchise', id, name: nameOf(s.name) } : null;
  if (s.kind === 'studio') return id ? { kind: 'studio', id, name: nameOf(s.name), type: mediaOf(s.type) ?? 'movie' } : null;
  if (s.kind === 'network') return id ? { kind: 'network', id, name: nameOf(s.name) } : null;
  if (s.kind === 'discover') {
    const type = mediaOf(s.type);
    const raw = s.params && typeof s.params === 'object' ? (s.params as Record<string, unknown>) : {};
    const params = Object.fromEntries(Object.entries(raw).filter(([k, v]) => /^[a-zA-Z0-9_.]+$/.test(k) && (typeof v === 'string' || typeof v === 'number')).map(([k, v]) => [k, String(v).slice(0, 200)]).slice(0, 20));
    return type ? { kind: 'discover', type, params } : null;
  }
  if (typeof s.id === 'string' && s.id.trim() && ['movie', 'series', 'anime'].includes(String(s.type))) {
    const source: CollectionSource = { kind: 'catalog', id: s.id.trim(), type: s.type as 'movie' | 'series' | 'anime' };
    if (typeof s.genre === 'string' && s.genre.trim()) source.genre = s.genre.trim();
    return source;
  }
  return null;
}
export function folderOf(f: Partial<CollectionFolder> | null | undefined): CollectionFolder | null {
  if (!f || typeof f.id !== 'string' || !SLUG.test(f.id) || typeof f.name !== 'string' || !f.name.trim()) return null;
  const sources: CollectionSource[] = [];
  for (const raw of (Array.isArray(f.sources) ? f.sources : []) as Array<Record<string, unknown>>) {
    const source = sourceOf(raw);
    if (source) sources.push(source);
    if (sources.length >= 20) break;
  }
  return { id: f.id, name: f.name.trim().slice(0, 150), shape: shapeOf(f.shape), cover: url(f.cover), backdrop: url(f.backdrop), logo: url(f.logo), sources };
}
function generatorOf(g: Partial<CollectionGenerator> | null | undefined): CollectionGenerator | null {
  if (!g || typeof g.id !== 'string' || !SLUG.test(g.id) || typeof g.kind !== 'string' || !GENERATORS.has(g.kind)) return null;
  const out: CollectionGenerator = { id: g.id, kind: g.kind, shape: shapeOf(g.shape), limit: Math.min(100, posInt(g.limit) ?? 24), type: mediaOf(g.type) };
  if (g.catalog && typeof g.catalog.id === 'string' && ['movie', 'series', 'anime'].includes(String(g.catalog.type))) out.catalog = { id: g.catalog.id.trim(), type: g.catalog.type };
  if (Array.isArray(g.ids)) out.ids = g.ids.map(posInt).filter((n): n is number => !!n).slice(0, 100);
  return out;
}
export function collectionOf(c: Partial<JellyfinCollection> | null | undefined, profiles?: Set<string>): JellyfinCollection | null {
  if (!c || typeof c.id !== 'string' || !SLUG.test(c.id) || typeof c.name !== 'string' || !c.name.trim()) return null;
  const folderIds = new Set<string>();
  const folders: CollectionFolder[] = [];
  for (const raw of (Array.isArray(c.folders) ? c.folders : []) as Array<Partial<CollectionFolder>>) {
    const folder = folderOf(raw);
    if (!folder || folderIds.has(folder.id)) continue;
    folderIds.add(folder.id);
    folders.push(folder);
    if (folders.length >= 200) break;
  }
  const generators: CollectionGenerator[] = [];
  for (const raw of (Array.isArray(c.generators) ? c.generators : []) as Array<Partial<CollectionGenerator>>) {
    const g = generatorOf(raw);
    if (g && !folderIds.has(g.id)) { folderIds.add(g.id); generators.push(g); }
    if (generators.length >= 20) break;
  }
  return {
    id: c.id, name: c.name.trim().slice(0, 150), description: typeof c.description === 'string' ? c.description.trim().slice(0, 1000) || undefined : undefined,
    backdrop: url(c.backdrop), cover: url(c.cover), coverShape: shapeOf(c.coverShape), shape: shapeOf(c.shape),
    profiles: profiles ? arr(c.profiles).filter((id) => profiles.has(id)) : arr(c.profiles), generators, folders,
  };
}
function collectionsOf(raw: unknown, profiles: Set<string>): JellyfinCollection[] {
  const seen = new Set<string>();
  const out: JellyfinCollection[] = [];
  for (const c of (Array.isArray(raw) ? raw : []) as Array<Partial<JellyfinCollection>>) {
    const collection = collectionOf(c, profiles);
    if (!collection || seen.has(collection.id)) continue;
    seen.add(collection.id);
    out.push(collection);
    if (out.length >= 50) break;
  }
  return out;
}

function str(v: unknown, d: string): string { return typeof v === 'string' && v.length ? v : d; }
function arr(v: unknown): string[] { return Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()) : []; }

export function metaAddons(cfg: RillConfig): string[] {
  return [...new Set([...cfg.addons.catalog, ...cfg.addons.meta])];
}
