import type { Meta } from '../stremio/types';
import { decodeGuid } from './ids';
import type { Library } from './library';
import { personFor } from './people';
import { boxSetCoverUrl, boxSetOf, collectionOf } from './collections';
import type { JfRequest } from './request';
import { artworkTag } from './image-tags';

const IMAGE_LIMIT = 8 * 1024 * 1024;
// Served from the same origin as the settings page, so anything a browser could run (SVG, HTML) must never pass as an image.
export const MEDIA_HEADERS = { 'content-security-policy': 'sandbox', 'x-content-type-options': 'nosniff', 'content-disposition': 'inline' };

function rasterType(raw: string, bytes: Uint8Array): string | null {
  const mime = raw.split(';')[0].trim().toLowerCase();
  const starts = (sig: number[], at = 0) => sig.every((n, i) => bytes[at + i] === n);
  if (mime === 'image/png' && starts([137, 80, 78, 71, 13, 10, 26, 10])) return mime;
  if (mime === 'image/jpeg' && starts([255, 216, 255])) return mime;
  if (mime === 'image/gif' && starts([71, 73, 70, 56]) && (bytes[4] === 55 || bytes[4] === 57) && bytes[5] === 97) return mime;
  if (mime === 'image/webp' && starts([82, 73, 70, 70]) && starts([87, 69, 66, 80], 8)) return mime;
  return null;
}

async function readLimited(body: ReadableStream<Uint8Array> | null, max: number): Promise<Uint8Array | null> {
  if (!body) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
    size += chunk.byteLength;
    if (size > max) { await body.cancel().catch(() => {}); return null; }
    chunks.push(chunk);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) { out.set(chunk, at); at += chunk.byteLength; }
  return out;
}

export type ImageKind = 'primary' | 'backdrop' | 'logo' | 'thumb' | 'banner' | 'art';

function pickTitleImage(meta: Meta, kind: ImageKind): string | undefined {
  switch (kind) {
    case 'primary':
      return meta.poster || meta.background;
    case 'backdrop':
    case 'thumb':
    case 'art':
    case 'banner':
      return meta.background || meta.poster;
    case 'logo':
      return meta.logo;
    default:
      return undefined;
  }
}

export async function imageUrlFor(lib: Library, itemId: string, kindRaw: string): Promise<string | null> {
  const kind = kindRaw.toLowerCase() as ImageKind;
  const g = decodeGuid(itemId);
  if (!g || g.kind === 'view') return null;
  if(g.kind==='misc') {
    if (g.sub === 'collection') {
      const collection = (await collectionOf(lib, g))?.collection;
      if (!collection) return null;
      if (kind === 'primary') return collection.cover ?? collection.backdrop ?? null;
      if (kind === 'logo') return null;
      return collection.backdrop ?? collection.cover ?? null;
    }
    if (g.sub === 'boxset') {
      const found = await boxSetOf(lib, g);
      return found ? boxSetCoverUrl(lib, found.folder, kind) : null;
    }
    const person=await personFor(lib.ctx,g);
    return person?.profile_path?`https://image.tmdb.org/t/p/h632${person.profile_path}`:null;
  }

  if (g.kind === 'movie' || g.kind === 'series') {
    const meta = await lib.meta(g, false);
    return meta ? pickTitleImage(meta, kind) ?? null : null;
  }

  const show = await lib.show(g);
  if (!show) return null;
  if (g.kind === 'season') {
    if(kind==='primary'&&g.season!==undefined&&show.meta.seasonPosters?.[g.season])return show.meta.seasonPosters[g.season];
    return pickTitleImage(show.meta, kind === 'primary' ? 'primary' : kind) ?? null;
  }
  const ep = lib.findEpisode(show, g);
  if (kind === 'primary') return ep?.video.thumbnail || show.meta.background || show.meta.poster || null;
  return pickTitleImage(show.meta, kind) ?? null;
}

function sizedImage(url: string, kind: string, maxWidth: number): string {
  const parsed = new URL(url);
  if (parsed.hostname !== 'image.tmdb.org' || !/^\/t\/p\/(original|[wh]\d+)\//.test(parsed.pathname) || !maxWidth) return url;
  // Use the upstream's existing sizes; image decoding/re-encoding exceeds the free CPU budget.
  const widths = kind === 'logo' ? [45,92,154,185,300,500]
    : ['backdrop','thumb','art','banner'].includes(kind) ? [300,780,1280]
    : [92,154,185,342,500,780];
  const width = widths.filter(width => width <= maxWidth).at(-1) ?? widths[0];
  parsed.pathname = parsed.pathname.replace(/\/t\/p\/(original|[wh]\d+)\//, `/t/p/w${width}/`);
  return parsed.href;
}

export async function imageResponse(jf: JfRequest, request: Request, url: string, kind: string): Promise<Response> {
  const maxWidth = Number(jf.q('maxWidth') ?? jf.q('width') ?? 0);
  const quality = Number(jf.q('quality') ?? 90);
  if (!Number.isInteger(maxWidth) || maxWidth < 0 || !Number.isInteger(quality) || quality < 0 || quality > 100) {
    return new Response(null, {status:400});
  }
  // Quality is accepted as a client preference; original encoding and alpha are preserved.
  const source = sizedImage(url, kind, maxWidth);
  // New namespace: entries cached before the raster check may hold SVG.
  const cacheKey = `${jf.ctx.origin}/.rill-images-v2/${jf.ctx.scope}/${artworkTag(source)}`;
  let response: Response | undefined;
  try { response = await caches.default.match(cacheKey); } catch {}
  if (!response) {
    let upstream: Response;
    try { upstream = await fetch(source, {signal:AbortSignal.timeout(15000)}); }
    catch {
      console.warn('Jellyfin image fetch failed', {type:kind,host:new URL(source).hostname});
      return new Response(null, {status:502,headers:{'cache-control':'no-store'}});
    }
    const contentType = upstream.headers.get('content-type') ?? '';
    if (!upstream.ok || !contentType.toLowerCase().startsWith('image/')) {
      await upstream.body?.cancel();
      console.warn('Jellyfin image unavailable', {type:kind,host:new URL(source).hostname,status:upstream.status});
      return new Response(null, {status:upstream.status === 404 ? 404 : 502,headers:{'cache-control':'no-store'}});
    }
    const bytes = Number(upstream.headers.get('content-length') ?? 0) > IMAGE_LIMIT ? null : await readLimited(upstream.body, IMAGE_LIMIT);
    const mime = bytes && rasterType(contentType, bytes);
    if (!bytes || !mime) {
      await upstream.body?.cancel().catch(() => {});
      console.warn('Jellyfin image rejected', {type:kind,host:new URL(source).hostname});
      return new Response(null, {status:502,headers:{'cache-control':'no-store'}});
    }
    response = new Response(bytes, {headers:{
      ...MEDIA_HEADERS,
      'content-type':mime,
      'cache-control':'public, max-age=86400',
      etag:upstream.headers.get('etag') ?? `"${artworkTag(source)}"`,
    }});
    if (jf.ctx.defer) jf.ctx.defer(caches.default.put(cacheKey, response.clone()).catch(() => {}));
  }
  const headers = new Headers(response.headers);
  if (!jf.q('tag')) headers.set('cache-control', 'public, max-age=300');
  const etag = headers.get('etag');
  const matches = (request.headers.get('if-none-match') ?? '').split(',').some(tag => tag.trim() === '*' || tag.trim().replace(/^W\//, '') === etag?.replace(/^W\//, ''));
  if (matches || request.method === 'HEAD') {
    await response.body?.cancel();
    return new Response(null, {status:matches ? 304 : 200,headers});
  }
  return new Response(response.body, {headers});
}
