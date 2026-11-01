import { externalStreams, externalSubtitles } from '../stremio/client';
import type { Stream } from '../stremio/types';
import { containerOf, mediaSource, mediaSourceId, runtimeTicks, streamLabel, subtitleContentType, subtitleFormat, subtitleEntries, type Dto, type MediaSourceInput } from './dto';
import { plainGuid, type TitleGuid } from './ids';
import type { Library } from './library';
import { MEDIA_HEADERS } from './images';

function playable(s: Stream): s is Stream & { url: string } {
  if (!s || typeof s.url !== 'string' || !/^https?:\/\//i.test(s.url)) return false;
  const ph = s.behaviorHints?.proxyHeaders;
  if (ph && ((ph.request && Object.keys(ph.request).length) || (ph.response && Object.keys(ph.response).length))) return false;
  return true;
}

export interface ResolvedSources {
  sources: Dto[];
  streamType: string;
  streamId: string;
}

export async function resolveSources(lib: Library, g: TitleGuid, itemId: string, options: { includeSubtitles?: boolean } = {}): Promise<ResolvedSources> {
  const empty = { sources: [], streamType: '', streamId: '' };
  if ((g.kind !== 'movie' && g.kind !== 'episode') || g.source === 'tmdbc' || g.source === 'tvdbc') return empty;
  const ctx = lib.ctx;
  const show = g.kind === 'episode' ? await lib.show(g) : null;
  const meta = g.kind === 'movie' ? await lib.meta(g) : show?.meta ?? null;
  // A stream add-on can resolve the item ID without metadata, but age restrictions
  // must still fail closed when metadata is unavailable or was filtered out.
  if (!meta && ctx.cfg.ageCap && ctx.cfg.ageCap.toLowerCase() !== 'none') return empty;
  if(meta?.collection)return empty;
  const streamType = lib.streamTypeOf(g);
  const streamIds = lib.streamIdsOf(show, g, meta);
  const streamId = streamIds[0];

  let streams: Stream[] = [];
  try {
    streams = await externalStreams(ctx, streamType, streamIds, g.kind === 'movie' ? 'movie' : 'series');
  } catch {
    streams = [];
  }
  const usable = streams.filter(playable).slice(0, ctx.cfg.jellyfin.maxSources);
  if (!usable.length) return { sources: [], streamType, streamId };

  const runtime = runtimeTicks(meta?.runtime);
  const subs = options.includeSubtitles !== false && ctx.cfg.addons.subtitle.length ? subtitleEntries(await externalSubtitles(ctx, streamType, streamIds, {}, g.kind === 'movie' ? 'movie' : 'series').catch(() => [])) : [];

  const seen = new Set<string>();
  const sources: Dto[] = [];
  for (const s of usable) {
    const hashed = await mediaSourceId(s.url);
    if (seen.has(hashed)) continue;
    seen.add(hashed);
    const id = sources.length === 0 ? plainGuid(itemId) || hashed : hashed;
    const size = Number(s.behaviorHints?.videoSize);
    const input: MediaSourceInput = {
      id,
      url: s.url,
      label: streamLabel(s),
      container: containerOf(s),
      size: Number.isFinite(size) && size > 0 ? size : null,
      filename: s.behaviorHints?.filename ?? null,
      runtimeTicks: runtime,
      subtitles: [
        ...(s.subtitles ?? []).filter((x) => x && /^https?:\/\//i.test(x.url)),
        ...subs,
      ].map((x, i) => ({ url: x.url, lang: x.lang || 'und', deliveryUrl: `${lib.jf.base}/Videos/${plainGuid(itemId)}/${id}/Subtitles/${2 + i}/Stream.${subtitleFormat(x.url)}${lib.jf.accessToken ? `?api_key=${encodeURIComponent(lib.jf.accessToken)}` : ''}` })),
    };
    const dto = mediaSource(input);
    dto.ETag = hashed;
    sources.push(dto);
  }
  return { sources, streamType, streamId };
}

export function playbackInfo(sources: Dto[], wantedSourceId: string | undefined, itemId: string): Dto {
  let picked = sources;
  const wanted = wantedSourceId ? plainGuid(wantedSourceId) || wantedSourceId : '';
  if (wanted && wanted !== plainGuid(itemId)) {
    const match = sources.filter((s) => s.Id === wanted || s.ETag === wanted);
    if (match.length) picked = match;
  }
  if (!picked.length) return { MediaSources: [], PlaySessionId: crypto.randomUUID(), ErrorCode: 'NoCompatibleStream' };
  return { MediaSources: picked, PlaySessionId: crypto.randomUUID() };
}

export function pickSource(sources: Dto[], wantedSourceId: string | undefined, itemId: string): Dto | null {
  if (!sources.length) return null;
  const wanted = wantedSourceId ? plainGuid(wantedSourceId) || wantedSourceId : '';
  if (!wanted || wanted === plainGuid(itemId)) return sources[0];
  return sources.find((s) => s.Id === wanted || s.ETag === wanted) ?? null;
}

export async function subtitleResponse(sources: Dto[], sourceId: string, index: number, fmt: string): Promise<Response> {
  const wanted = plainGuid(sourceId) || sourceId;
  const src = sources.find((s) => s.Id === wanted || s.ETag === wanted) ?? sources[0];
  const streams = (src?.MediaStreams as Dto[] | undefined) ?? [];
  const sub = streams.find((s) => s.Type === 'Subtitle' && s.Index === index);
  const url = sub?.DeliveryUrl ? subtitleUrlOf(sub) : null;
  if (!url) return new Response('Subtitle not found', { status: 404 });
  try {
    const upstream = await fetch(url, { headers: { accept: '*/*' },signal:AbortSignal.timeout(15000) });
    if (!upstream.ok) return new Response('Subtitle unavailable', { status: 502 });
    const original=subtitleFormat(url),requested=fmt.replace(/^.*\./,'').toLowerCase();
    const type = subtitleContentType(requested || original);
    if(requested==='vtt'&&original==='srt') {
      const text=(await upstream.text()).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
      const vtt='WEBVTT\n\n'+text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g,'$1.$2');
      return new Response(vtt,{headers:{...MEDIA_HEADERS,'content-type':type,'cache-control':'private, max-age=3600'}});
    }
    if(requested&&requested!==original){await upstream.body?.cancel();return new Response('Unsupported subtitle conversion',{status:400});}
    return new Response(upstream.body, { status: 200, headers: { ...MEDIA_HEADERS, 'content-type': type, 'cache-control': 'private, max-age=3600' } });
  } catch {
    return new Response('Subtitle unavailable', { status: 502 });
  }
}

function subtitleUrlOf(stream: Dto): string | null {
  const raw = stream.Path;
  return typeof raw === 'string' && /^https?:\/\//i.test(raw) ? raw : null;
}
