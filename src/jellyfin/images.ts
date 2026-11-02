import type { Meta } from '../stremio/types';
import { decodeGuid } from './ids';
import type { Library } from './library';
import { personFor } from './people';
import { boxSetCoverUrl, boxSetOf, collectionOf } from './collections';
import type { JfRequest } from './request';
import { artworkTag } from './image-tags';

const IMAGE_LIMIT = 32 * 1024 * 1024;
// Served from the same origin as the settings page, so anything a browser could run (SVG, HTML) must never pass as an image.
export const MEDIA_HEADERS = { 'content-security-policy': 'sandbox', 'x-content-type-options': 'nosniff', 'content-disposition': 'inline' };

// The type comes from the bytes: hosts often mislabel JPEG as image/png or image/jpg, and SVG has no signature here.
function rasterType(bytes: Uint8Array): string | null {
  const starts = (sig: number[], at = 0) => sig.every((n, i) => bytes[at + i] === n);
  if (starts([137, 80, 78, 71, 13, 10, 26, 10])) return 'image/png';
  if (starts([255, 216, 255])) return 'image/jpeg';
  if (starts([71, 73, 70, 56]) && (bytes[4] === 55 || bytes[4] === 57) && bytes[5] === 97) return 'image/gif';
  if (starts([82, 73, 70, 70]) && starts([87, 69, 66, 80], 8)) return 'image/webp';
  return null;
}

// Reads just enough to identify the image, then streams the rest through a byte counter.
async function rasterBody(body: ReadableStream<Uint8Array>, max: number): Promise<{ mime: string; stream: ReadableStream<Uint8Array> } | null> {
  const reader = body.getReader();
  let head = new Uint8Array(0);
  while (head.length < 12) {
    const { done, value } = await reader.read();
    if (done) break;
    const next = new Uint8Array(head.length + value.length);
    next.set(head); next.set(value, head.length); head = next;
  }
  const mime = rasterType(head);
  if (!mime || head.length > max) { await reader.cancel().catch(() => {}); return null; }
  let size = head.length;
  return { mime, stream: new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(head); },
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) { controller.close(); return; }
      size += value.length;
      if (size > max) { controller.error(new Error('Image exceeds byte limit')); await reader.cancel().catch(() => {}); return; }
      controller.enqueue(value);
    },
    cancel(reason) { return reader.cancel(reason); },
  }) };
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
    const raster = upstream.body && Number(upstream.headers.get('content-length') ?? 0) <= IMAGE_LIMIT ? await rasterBody(upstream.body, IMAGE_LIMIT) : null;
    if (!raster) {
      await upstream.body?.cancel().catch(() => {});
      console.warn('Jellyfin image rejected', {type:kind,host:new URL(source).hostname});
      return new Response(null, {status:502,headers:{'cache-control':'no-store'}});
    }
    response = new Response(raster.stream, {headers:{
      ...MEDIA_HEADERS,
      'content-type':raster.mime,
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
