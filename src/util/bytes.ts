import { Buffer } from 'node:buffer';

export function b64urlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64url');
}
export function b64urlDecode(text: string): Uint8Array {
  const pad = text.length % 4 ? '='.repeat(4 - (text.length % 4)) : '';
  const input = (text + pad).replace(/[\t\n\f\r ]/g, '');
  // Buffer silently skips invalid input; preserve the errors callers received from atob.
  if (!/^[A-Za-z0-9_+/-]*={0,2}$/.test(input) || input.replace(/=+$/, '').length % 4 === 1 || input.includes('=') && input.length % 4 !== 0) throw Error('Invalid base64');
  return new Uint8Array(Buffer.from(input, 'base64url'));
}
export function hex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export async function sha256(text: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}
export async function hmac(secret: string, text: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
}
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
