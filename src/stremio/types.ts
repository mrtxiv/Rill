export type ContentType = 'movie' | 'series' | 'anime' | 'channel' | 'tv';

export interface ManifestCatalog {
  type: ContentType;
  id: string;
  name: string;
  extra?: Array<{ name: string; isRequired?: boolean; options?: string[]; optionsLimit?: number }>;
  extraSupported?: string[];
  extraRequired?: string[];
  genres?: string[];
}

export interface Manifest {
  id: string;
  version: string;
  name: string;
  description?: string;
  logo?: string;
  background?: string;
  resources: Array<string | { name: string; types: string[]; idPrefixes?: string[] }>;
  types: string[];
  catalogs: ManifestCatalog[];
  idPrefixes?: string[];
  behaviorHints?: { configurable?: boolean; configurationRequired?: boolean; adult?: boolean; p2p?: boolean };
}

export interface MetaVideo {
  numbering?: 'tvdb' | 'tmdb' | 'anime';
  trackerAnime?: { mal?: number; anilist?: number; kitsu?: number; anidb?: number; episode: number };
  id: string;
  title: string;
  season?: number;
  episode?: number;
  released?: string;
  thumbnail?: string;
  overview?: string;
  rating?: string;
  streams?: Stream[];
}

export interface MetaLink { name: string; category: string; url: string }

export interface MetaPerson {
  name: string;
  type: 'Actor' | 'Director' | 'Writer';
  tmdbId?: number;
  role?: string;
  image?: string;
}

export interface MetaPreview {
  id: string;
  type: ContentType;
  name: string;
  poster?: string;
  posterShape?: 'poster' | 'landscape' | 'square';
  background?: string;
  logo?: string;
  description?: string;
  releaseInfo?: string;
  imdbRating?: string;
  genres?: string[];
  year?: number | string;
}

export interface Meta extends MetaPreview {
  people?: MetaPerson[];
  originalTitle?: string;
  tagline?: string;
  studios?: string[];
  collection?:boolean;
  seasonPosters?:Record<number,string>;
  runtime?: string;
  released?: string;
  videos?: MetaVideo[];
  cast?: string[];
  director?: string[];
  writer?: string[];
  country?: string;
  language?: string;
  links?: MetaLink[];
  trailers?: Array<{ source: string; type: 'Trailer' | 'Clip' }>;
  awards?: string;
  certification?: string;
  ids?: { imdb?: string; tmdb?: number; tvdb?: number; tvmaze?:number; mal?: number; anilist?: number; kitsu?: number; anidb?: number };
  behaviorHints?: { defaultVideoId?: string | null; hasScheduledVideos?: boolean };
  status?: string;
  network?: string;
}

export interface Stream {
  url?: string;
  ytId?: string;
  infoHash?: string;
  fileIdx?: number;
  sources?: string[];
  externalUrl?: string;
  name?: string;
  title?: string;
  description?: string;
  subtitles?: Subtitle[];
  behaviorHints?: {
    notWebReady?: boolean;
    bingeGroup?: string;
    countryWhitelist?: string[];
    proxyHeaders?: { request?: Record<string, string>; response?: Record<string, string> };
    filename?: string;
    videoSize?: number;
    videoHash?: string;
  };
}

export interface Subtitle { id: string; url: string; lang: string }

export interface CatalogRequest {
  type: ContentType;
  id: string;
  extra: { search?: string; genre?: string; skip?: number; [k: string]: string | number | undefined };
}
