import { BRAND_LOGO, BRAND_VERSION } from '../brand';
import { DEFAULT_CONFIG } from '../config/schema';

const LANGUAGES = [
  'en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'es-MX', 'it-IT', 'pt-BR', 'pt-PT', 'nl-NL', 'sv-SE', 'da-DK', 'nb-NO',
  'fi-FI', 'pl-PL', 'cs-CZ', 'hu-HU', 'ro-RO', 'el-GR', 'tr-TR', 'ru-RU', 'uk-UA', 'ar-SA', 'he-IL', 'hi-IN', 'ja-JP',
  'ko-KR', 'zh-CN', 'zh-TW', 'th-TH', 'vi-VN', 'id-ID',
];

const AGE_CAPS: Array<[string, string]> = [
  ['', 'No cap'],
  ['G', 'G'], ['PG', 'PG'], ['PG-13', 'PG-13'], ['R', 'R'], ['NC-17', 'NC-17'],
  ['TV-Y', 'TV-Y'], ['TV-Y7', 'TV-Y7'], ['TV-G', 'TV-G'], ['TV-PG', 'TV-PG'], ['TV-14', 'TV-14'], ['TV-MA', 'TV-MA'],
];

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function options(list: Array<[string, string]>): string {
  return list.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
}

const PROVIDER_OPTS: Array<[string, string]> = [['off', 'Off · use add-ons'], ['tmdb', 'TMDB'], ['tvdb', 'TVDB'], ['cinemeta', 'Cinemeta'], ['tvmaze', 'TVmaze']];
const ANIME_OPTS: Array<[string, string]> = [['off', 'Off · use add-ons'], ['mal', 'MyAnimeList'], ['anilist', 'AniList'], ['kitsu', 'Kitsu'], ['tmdb', 'TMDB'], ['tvdb', 'TVDB']];

const CSS = `
:root { --fg:#f3f3f3; --bg:#0a0a0a; --mute:#9d9d9d; --line:#2b2b2b; --faint:#1d1d1d; --accent:#eeeeee; color-scheme:dark; }
* { box-sizing:border-box; letter-spacing:0!important; }
[hidden] { display:none!important; }
html,body { margin:0; min-height:100%; background:var(--bg); color:var(--fg); }
body { font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; -webkit-font-smoothing:antialiased; letter-spacing:-.015em; }
main { max-width:960px; margin:auto; padding:0 28px 48px; }
header { padding-top:26px; position:sticky; top:0; z-index:5; background:var(--bg); }
.brand-row { display:flex; justify-content:space-between; align-items:center; gap:24px; }
.brand { display:flex; align-items:center; gap:12px; flex-shrink:0; }
.brand .brand-cat { display:block; width:44px; height:51px; object-fit:contain; }
.wordmark { margin:0; line-height:0; }
.brand .brand-wordmark { display:block; width:90px; height:38px; }
.brand.brand-welcome { gap:16px; align-items:flex-end; margin-bottom:28px; }
.brand-welcome .brand-cat { width:98px; height:113px; }
.brand-welcome .brand-wordmark { width:146px; height:60px; margin-bottom:6px; }
.header-actions { display:flex; align-items:center; gap:14px; }
.account { position:relative; }
.account:empty { display:none; }
.chip { display:inline-flex; align-items:center; gap:9px; padding:5px 12px 5px 5px; border:1px solid var(--line); border-radius:9px; background:#101010; color:var(--fg); font-size:13px; font-weight:500; line-height:1; }
.chip:hover, .chip[aria-expanded=true] { background:#181818; border-color:#3a3a3a; }
.chip .chev { color:var(--mute); font-size:10px; margin-left:-2px; }
.chip.cta { padding:8px 14px; color:var(--mute); }
.chip.cta:hover { color:var(--fg); }
.avatar { width:26px; height:26px; border-radius:6px; background:var(--accent); color:#111; font-weight:700; font-size:12px; display:inline-grid; place-items:center; letter-spacing:0; }
.avatar.big { width:36px; height:36px; font-size:15px; }
.popover { position:absolute; right:0; top:calc(100% + 10px); min-width:250px; background:#131313; border:1px solid var(--line); border-radius:14px; padding:8px; box-shadow:0 24px 60px #000c; z-index:30; }
.popover[hidden] { display:none; }
.pop-user { display:flex; align-items:center; gap:12px; padding:10px 10px 12px; border-bottom:1px solid var(--line); margin-bottom:6px; }
.pop-user strong { display:block; font-size:14px; font-weight:600; }
.pop-user small { display:block; font-size:12px; color:var(--mute); margin-top:3px; }
.popover [role=menuitem] { display:block; width:100%; text-align:left; padding:10px 10px; border-radius:9px; background:none; border:0; color:var(--fg); font-size:13px; }
.popover [role=menuitem]:hover { background:#1e1e1e; }
#menu-btn { display:none; }
#drawer-backdrop { position:fixed; inset:0; background:#000a; z-index:55; backdrop-filter:blur(3px); opacity:0; transition:opacity .25s ease; }
#drawer-backdrop.open { opacity:1; }
#drawer { position:fixed; top:0; right:0; bottom:0; width:min(330px,88vw); background:#0e0e0e; border-left:1px solid var(--line); z-index:60; padding:22px 18px 26px; display:flex; flex-direction:column; gap:20px; transform:translateX(100%); transition:transform .28s cubic-bezier(.2,.8,.2,1); overflow-y:auto; }
#drawer.open { transform:none; }
#drawer[hidden], #drawer-backdrop[hidden] { display:none; }
.drawer-head { display:flex; justify-content:space-between; align-items:center; }
.drawer-head .wordmark { font-size:22px; font-weight:600; letter-spacing:-.8px; }
#drawer-close { width:36px; height:36px; border-radius:9px; border:1px solid var(--line); background:#151515; color:var(--fg); font-size:13px; }
#drawer-account { display:flex; align-items:center; gap:12px; padding:12px; border:1px solid var(--line); border-radius:14px; background:#121212; }
#drawer-account:empty { display:none; }
#drawer-account .meta { flex:1; min-width:0; }
#drawer-account strong { display:block; font-size:14px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#drawer-account small { display:block; font-size:12px; color:var(--mute); margin-top:2px; }
#drawer-account .q { padding:0; font-size:12px; }
.drawer-nav { display:flex; flex-direction:column; gap:3px; }
.drawer-nav button { display:flex; align-items:center; justify-content:space-between; width:100%; text-align:left; padding:13px 14px; border-radius:11px; background:none; border:0; color:var(--mute); font-size:16px; font-weight:500; }
.drawer-nav button:after { content:'›'; color:#5a5a5a; font-size:18px; }
.drawer-nav button.active { background:#1b1b1b; color:var(--fg); }
.drawer-nav button[hidden] { display:none; }
.drawer-mode { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:0 4px; }
.drawer-mode .t { margin:0; color:var(--mute); font-size:12px; }
.seg { display:inline-flex; border:1px solid var(--line); border-radius:9px; overflow:hidden; background:#101010; }
.seg button { padding:9px 14px; background:none; border:0; color:var(--mute); font-size:13px; }
.seg button[aria-pressed=true] { background:#222; color:var(--fg); }

.locked > .t, .locked > .key-row .t, .locked .n { color:#7a7a7a; }
.locked input:not([type=checkbox]), .locked textarea { opacity:.5; }
.need-tag { display:inline-flex; align-items:center; gap:6px; margin:8px 0 0; padding:4px 9px; white-space:nowrap; border:1px dashed #3a3a3a; border-radius:6px; background:none; color:var(--mute); font-size:11px; line-height:1.2; }
.need-tag:after { content:'→'; }
.need-tag:hover { color:var(--fg); border-color:#5a5a5a; }
.checks label.locked { color:#6f6f6f; }
.checks label .need-tag { margin:0 0 0 auto; padding:2px 7px; font-size:10px; }
.item.locked .n { color:#6f6f6f; }
.item .need-tag { margin:0; }
.key-row { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:6px; }
.key-row .t { margin:0; }
.pill { font-size:11px; padding:3px 8px; border-radius:6px; border:1px solid #333; color:var(--mute); line-height:1.2; }
.pill.on { color:#111; background:var(--accent); border-color:var(--accent); }
.key-link { display:inline-block; margin-top:8px; font-size:12px; color:var(--mute); text-decoration:none; }
.key-link:hover { color:var(--fg); }
.reqs { margin:0 0 12px; }
.req { display:inline-block; margin:0 14px 6px 0; font-size:12px; color:var(--mute); }
.req.on { color:var(--fg); }
.tabs-row { display:flex; align-items:center; gap:16px; margin-top:22px; padding-bottom:16px; }
.tabs-row .tabs { flex:1 1 auto; min-width:0; margin:0; padding:0; }
.tabs-row .mode { flex:none; }
#setup-gate { position:fixed; inset:0; z-index:100; background:var(--bg); display:flex; align-items:center; justify-content:center; padding:24px; overflow:auto; align-items:safe center; }
#setup-gate[hidden] { display:none; }
#setup-form { width:100%; max-width:380px; }
#setup-form .brand { margin-bottom:28px; }
#setup-form h2 { margin-bottom:8px; }
#setup-form input { width:100%; }
#setup-submit { width:100%; background:var(--accent); color:#141414; border:1px solid #ffffff; padding:11px 16px; border-radius:8px; font-weight:650; margin-top:4px; }
#login-gate { position:fixed; inset:0; z-index:100; background:var(--bg); display:flex; align-items:safe center; justify-content:center; padding:24px; overflow:auto; }
#login-gate[hidden] { display:none; }
#login-form { width:100%; max-width:360px; }
#login-form .brand { margin-bottom:28px; }
#login-form input { width:100%; }
#login-submit { width:100%; background:var(--accent); color:#141414; border:1px solid #ffffff; padding:11px 16px; border-radius:8px; font-weight:650; }
.mode { display:inline-flex; border:1px solid #eeeeee29; border-radius:6px; overflow:hidden; }
.mode label { cursor:pointer; }
.mode input { position:absolute; opacity:0; pointer-events:none; }
.mode span { display:block; padding:6px 11px; font-size:12px; color:#969696; }
.mode input:checked + span { color:var(--accent); background:#eeeeee0b; }
.mode input:focus-visible + span { outline:1px solid var(--accent); }
[data-advanced][hidden] { display:none; }
.mode-note { font-size:12px; color:var(--mute); margin:-8px 0 18px; }
#draft-status { font-size:12px; color:var(--mute); }
button { appearance:none; font:inherit; font-size:13px; font-weight:550; border:1px solid #393939; border-radius:8px; background:#1e1e1e; color:var(--fg); padding:11px 17px; cursor:pointer; transition:background .18s,border-color .18s,box-shadow .18s,transform .18s; }
button:hover { background:#2d2d2d; border-color:#5d5d5d; box-shadow:0 3px 12px #0003; }
button:active:not(:disabled) { transform:translateY(1px); }
button:disabled { opacity:.4; cursor:default; }
.tabs { display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; margin-top:22px; padding:0 0 16px; border-bottom:0; }
.tabs button { flex:none; background:none; border:1px solid transparent; border-radius:6px; padding:7px 11px; color:#969696; }
.tabs button:hover { color:var(--fg); background:#171717; }
.tabs button[aria-selected=true] { color:var(--accent); background:#eeeeee0b; border-color:#eeeeee29; }
.workspace { padding-top:24px; }
section { margin:0; }
section + section { margin-top:36px; padding-top:16px; border-top:0; }
h2 { font-size:22px; font-weight:500; letter-spacing:-.6px; line-height:1.3; margin:0 0 18px; }
h2 small { display:none; }
h3 { font-size:15px; font-weight:500; letter-spacing:-.2px; margin:24px 0 14px; }
.section-content { min-width:0; }
.section-content > :first-child { margin-top:0; }
.f { margin-bottom:18px; min-width:0; }
label.t, span.t { display:block; font-size:14px; font-weight:500; margin-bottom:10px; }
label.f { display:block; }
.group { padding:18px; border:1px solid var(--line); border-radius:10px; background:#111; margin:0 0 14px; }
.group > .f:last-of-type { margin-bottom:14px; }
.group > select { margin-bottom:14px; }
.group .f:has(> input + button) { display:flex; flex-wrap:wrap; align-items:center; gap:10px; }
.group .f:has(> input + button) > input { flex:1 1 240px; }
input[type=file] { width:100%; min-height:46px; padding:10px 12px; border:1px dashed #3a3a3a; border-radius:8px; background:#0f0f0f; color:var(--mute); font:inherit; font-size:13px; }
input[type=file]::file-selector-button { font:inherit; font-size:13px; font-weight:500; color:var(--fg); background:#1e1e1e; border:1px solid #393939; border-radius:6px; padding:6px 12px; margin-right:12px; cursor:pointer; }
input[type=file]::file-selector-button:hover { background:#262626; }
input[type=text],input[type=password],input[type=number],input[type=url],select,textarea { width:100%; min-width:0; min-height:38px; font:inherit; color:inherit; background:#0d0d0d; border:1px solid #383838; border-radius:6px; padding:8px 11px; margin:0; outline:none; appearance:none; }
input::placeholder,textarea::placeholder { color:#717171; }
input:hover,select:hover,textarea:hover { border-color:#606060; }
input:focus,select:focus,textarea:focus { border-color:#b3b3b3; }
:focus-visible { outline:2px solid #c9c9c9; outline-offset:4px; }
.sel { position:relative; }
.sel:after { content:'⌄'; position:absolute; right:12px; top:6px; pointer-events:none; color:var(--mute); }
select { padding-right:36px; }
textarea { min-height:76px; resize:vertical; font-size:14px; line-height:1.6; }
.two { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0 20px; }
.row { display:flex; flex-wrap:wrap; align-items:flex-end; gap:12px; }
.row > .f { flex:1; min-width:140px; }
.hint,.note { font-size:14px; line-height:1.65; color:var(--mute); margin:6px 0 16px; max-width:740px; }
button.q { border:0; background:none; color:#bbb; padding:0; text-decoration:underline; text-underline-offset:4px; }
a { color:var(--fg); text-underline-offset:4px; }
#s-general .section-content { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.setting-row { display:flex; flex-direction:column; justify-content:space-between; gap:16px; min-height:0; padding:18px; background:#171717; border:1px solid #353535; border-radius:10px; }
.setting-row label.t { font-size:15px; font-weight:500; letter-spacing:-.2px; margin-bottom:6px; }
.setting-row .hint { margin:0; }
.setting-row .f { margin:0; }
.setting-row input { font-size:15px; min-height:38px; }
#s-age { grid-column:1 / -1; display:grid; grid-template-columns:1fr minmax(200px,320px); gap:4px 24px; align-items:center; margin:0; padding:18px; border:1px solid #353535; border-radius:10px; background:#111; }
#s-age h2 { font-size:15px; font-weight:500; letter-spacing:-.2px; margin:0; }
#s-age .f { grid-column:2; grid-row:1 / span 2; margin:0; }
#s-age .f > label { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }
#s-age .note { margin:0; grid-column:1; max-width:420px; }
#s-meta .section-content,#s-jellyfin .section-content,#s-search .section-content { padding:0; }
.list { display:grid; gap:4px; border:0; border-radius:6px; margin:0 0 24px; overflow:hidden; }
.item { display:flex; align-items:center; gap:14px; padding:10px 12px; border:0; border-radius:6px; background:#161616; }
.item:last-child { border:0; }
.item .n { flex:1; min-width:0; }
.item .n small { display:block; font-size:12px; color:var(--mute); }
.item.off .n { color:#808080; }
.ud { display:flex; gap:4px; }
.ud button { padding:3px; width:34px; height:34px; color:#ccc; flex:none; }
input[type=checkbox] { appearance:none; width:34px; height:20px; border:1px solid #484848; border-radius:20px; background:#272727; margin:0; cursor:pointer; flex:none; position:relative; transition:background .18s,border-color .18s; }
input[type=checkbox]:before { content:''; position:absolute; width:12px; height:12px; border-radius:3px; background:#a8a8a8; top:3px; left:3px; transition:transform .18s,background .18s; }
input[type=checkbox]:checked { background:var(--accent); border-color:var(--accent); }
input[type=checkbox]:checked:before { background:#191919; transform:translateX(14px); }
.checks { display:flex; flex-wrap:wrap; gap:12px 24px; margin:0 0 24px; }
label.check { display:flex; align-items:center; gap:11px; margin:0 0 14px; font-size:14px; line-height:1.4; cursor:pointer; }
.two > label.check { grid-column:1 / -1; }
label.check + .two, label.check + .hint { margin-top:-4px; }
.checks label { display:inline-flex; align-items:center; gap:9px; font-size:14px; cursor:pointer; }
#scrobble { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
#scrobble label { border:1px solid #353535; border-radius:6px; background:#141414; padding:14px; min-width:0; flex-wrap:wrap; row-gap:8px; }
#scrobble label .need-tag { flex:none; }
#scrobble label:has(:checked) { border-color:#eeeeee44; background:#eeeeee08; }
.service-card { border:1px solid #343434; border-radius:8px; margin:12px 0; background:#141414; }
.service-card summary { display:flex; justify-content:space-between; align-items:center; padding:14px 18px; list-style:none; cursor:pointer; font-size:15px; }
.service-card summary::-webkit-details-marker { display:none; }
.service-card summary:after { content:'+'; color:#aaa; font-size:22px; font-weight:300; }
.service-card[open] summary:after { content:'−'; }
.service-card[open] summary { border-bottom:0; }
.svc { padding:18px; }
#s-addons .section-content > .f { border:1px solid #343434; border-radius:8px; padding:18px; background:#141414; }
#s-addons .b { display:flex; justify-content:flex-end; margin-top:12px; }
.gname { font-size:14px; color:#a9a9a9; padding:18px 0 10px; }
.status,.probe { font-size:13px; color:var(--mute); margin:10px 0; white-space:pre-line; }
.status:empty { display:none; }
.status.on { color:var(--fg); }
.probe div { padding:8px 0; border-bottom:1px solid var(--line); }
.out { margin-bottom:20px; border:1px solid #353535; padding:18px; border-radius:8px; background:#141414; }
.out .u { font:12px/1.6 ui-monospace,monospace; overflow-wrap:anywhere; padding:14px; border:1px solid #363636; border-radius:5px; background:#0d0d0d; max-height:110px; overflow:auto; }
.out .u:empty:before { content:'Preparing your link…'; color:var(--mute); }
.out .b { display:flex; align-items:center; flex-wrap:wrap; gap:12px; margin-top:12px; font-size:13px; }
.mono,.code { font-family:ui-monospace,monospace; overflow-wrap:anywhere; }
.code { font-size:26px; letter-spacing:.12em; }
input[type=text],input[type=password],input[type=number],input[type=url],select { min-height:44px; }
input:focus,select:focus,textarea:focus { box-shadow:0 0 0 3px #ffffff0c; }
.hint,.note,.status,.probe,.item .n { overflow-wrap:anywhere; }
.setting-row,#s-age { border-radius:8px; }
.item { min-height:58px; }
.item:hover { background:#1d1d1d; }
.ud { flex:none; }
.service-card summary { min-height:54px; gap:16px; }
.service-card summary:hover { background:#1b1b1b; }
.service-card summary:after { flex:none; width:16px; text-align:center; }
#profiles .f { display:block; }
#profiles .check { display:flex; align-items:center; gap:10px; margin:12px 0; }
#profiles > .svc { border-top:1px solid var(--line); padding:20px 0; }
#s-tracking .section-content > .b { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:22px; }
.out .u { user-select:all; }
.out .b > span { min-height:20px; }
header { background:#0a0a0af5; backdrop-filter:blur(16px); }
.workspace { padding-top:30px; }
h2 { font-weight:600; }
.setting-row,#s-age,.out,.service-card,#s-addons .section-content > .f { background:#131313; border-color:#2e2e2e; }
.setting-row { padding:22px; gap:24px; }
.setting-row:focus-within,#s-age:focus-within { border-color:#666666; }
input[type=text],input[type=password],input[type=number],input[type=url],select,textarea { background:#0d0d0d; border-color:#323232; border-radius:8px; padding:12px 14px; font-size:14px; min-height:46px; }
input:focus,select:focus,textarea:focus { border-color:#aaaaaa; box-shadow:0 0 0 3px #eeeeee0c; }
:focus-visible { outline-color:var(--accent); }
.list { border-color:#2e2e2e; border-radius:8px; }
.item { background:#131313; border-color:#2a2a2a; padding:13px 15px; }
.item:hover { background:#1d1d1d; }
.ud { gap:2px; }
.ud button { background:transparent; border-color:transparent; color:#999999; font-size:18px; }
.ud button:hover:not(:disabled) { color:var(--accent); background:#eeeeee0b; border-color:#eeeeee29; }
.ud button:disabled { opacity:.22; }
.out .u { background:#0b0b0b; border-color:#292929; color:#b5b5b5; border-radius:6px; }
.out .b [data-copy] { background:var(--accent); color:#141414; border-color:var(--accent); min-width:88px; }
.service-card summary { padding:18px 20px; }
.service-card summary:after { font-size:19px; color:var(--accent); }
.service-card summary:hover { background:#202020; }
#draft-status { font-size:11px; }
#draft-status:not(:empty):before { content:''; display:inline-block; height:5px; width:5px; border-radius:1.5px; background:var(--accent); margin-right:8px; }
.select-control { position:relative; min-width:0; }
.select-control > select { display:none; }
.sel:has(.select-control):after { display:none; }
.select-trigger { width:100%; min-height:46px; display:flex; justify-content:space-between; align-items:center; gap:12px; padding:12px 14px; background:#0d0d0d; border-color:#323232; text-align:left; font-size:14px; font-weight:400; }
.select-trigger:after { content:''; width:7px; height:7px; border-right:1.5px solid #a4a4a4; border-bottom:1.5px solid #a4a4a4; transform:rotate(45deg); margin:0 3px 4px 10px; flex:none; }
.select-trigger[aria-expanded=true] { border-color:#aaaaaa; box-shadow:0 0 0 3px #eeeeee0c; }
.select-menu { position:fixed; inset:auto; margin:0; padding:6px; border:1px solid #424242; border-radius:8px; background:#1b1b1b; color:var(--fg); box-shadow:0 18px 55px #0009; overflow:auto; z-index:20; }
.select-menu [role=option] { display:flex; justify-content:space-between; align-items:center; width:100%; text-align:left; background:transparent; border:0; border-radius:5px; padding:10px 12px; min-height:40px; font-weight:400; }
.select-menu [role=option]:hover,.select-menu [role=option]:focus { background:#2e2e2e; outline:none; box-shadow:none; }
.select-menu [aria-selected=true] { color:var(--accent); background:#eeeeee09; }
.select-menu [aria-selected=true]:after { content:'✓'; margin-left:12px; }
.select-menu,.out .u,textarea { scrollbar-width:thin; scrollbar-color:#494949 transparent; }
.tabs button { position:relative; min-height:40px; border-radius:6px; font-weight:500; }
.tabs button[aria-selected=true] { background:#242424; border-color:transparent; box-shadow:none; }
.setting-row,.out,.service-card { box-shadow:none; border-color:#222; }
.setting-row { border-color:#282828; }
.hint,.note { font-size:13px; line-height:1.75; }
.service-card { transition:border-color .18s; }
.service-card[open] { border-color:#484848; }
.service-card summary:after { content:''; width:7px; height:7px; border-right:1.5px solid #aaa; border-bottom:1.5px solid #aaa; transform:rotate(45deg); margin:0 4px 4px 12px; transition:transform .18s; }
.service-card[open] summary:after { content:''; transform:rotate(225deg); margin-bottom:0; }
.select-trigger:after { transition:transform .18s; }
.select-trigger[aria-expanded=true]:after { transform:rotate(225deg); margin-bottom:0; }
.select-menu [role=option] { gap:12px; }
.catalog-toolbar { display:flex; align-items:center; gap:16px; margin:22px 0 4px; }
.catalog-toolbar input { flex:1; width:100%; min-width:0; }
#catalog-count { color:var(--mute); font:12px ui-monospace,monospace; white-space:nowrap; }
#catalog-empty { color:var(--mute); text-align:center; padding:36px 20px; }
.item:focus-within { background:#202020; }
.tabs button:hover { box-shadow:none; }
.item .n { font-size:14px; }
.item .n small { margin-top:3px; font-size:11px; }
.ud button { width:36px; height:36px; border-radius:6px; }
.ud button:hover:not(:disabled) { border-color:transparent; box-shadow:none; background:#ffffff0b; }
input[type=text],input[type=password],input[type=number],input[type=url],textarea,.select-trigger { border-color:#292929; background:#111; }
.setting-row:focus-within,#s-age:focus-within { border-color:#383838; }
.out .u { border:0; padding:16px; line-height:1.8; }
.service-card summary { font-weight:500; }
.service-card .svc { padding-top:8px; }
.profile-settings { margin:8px 0 28px; padding:0; }
.profile-settings > summary,#profiles details > summary { display:flex; justify-content:space-between; align-items:center; gap:16px; list-style:none; cursor:pointer; min-height:48px; padding:12px 14px; background:#171717; border-radius:6px; font-size:14px; }
.profile-settings > summary::-webkit-details-marker,#profiles details > summary::-webkit-details-marker { display:none; }
.profile-settings > summary:after,#profiles details > summary:after { content:''; width:6px; height:6px; border-right:1.5px solid #999; border-bottom:1.5px solid #999; transform:rotate(45deg); margin-right:4px; flex:none; }
.profile-settings[open] > summary:after,#profiles details[open] > summary:after { transform:rotate(225deg); }
.profile-settings > .note { margin:14px 0; }
#profiles > .svc { border:0; background:#111; border-radius:8px; padding:20px; margin:12px 0; }
#profiles .check { font-size:13px; padding:6px 0; }
#profile-add { margin-top:10px; }
#s-jellyfin .section-content > .two { margin-bottom:8px; }
@media(min-width:961px) { #s-tracking .two { grid-template-columns:minmax(0,1fr) minmax(0,1.4fr); } }
@media(max-width:960px) { #s-tracking .two { grid-template-columns:1fr; } }
@media(max-width:700px) { input[type=text],input[type=password],input[type=number],input[type=url],textarea,.select-trigger { font-size:16px; } #scrobble { grid-template-columns:1fr; } #scrobble label { padding:12px 12px; gap:9px; font-size:12px; } }
@media(prefers-reduced-motion:reduce) { *,*:before { transition:none!important; } }
@media(max-width:700px) { main { padding:0 20px 40px; } header { padding-top:24px; } .brand { gap:10px; } .brand .brand-cat { width:40px; height:46px; } .brand .brand-wordmark { width:84px; height:35px; } .brand-welcome .brand-cat { width:94px; height:108px; } .brand-welcome .brand-wordmark { width:140px; height:58px; } .header-actions { gap:10px; } #account, .tabs-row { display:none; } #menu-btn { display:inline-flex; flex-direction:column; justify-content:center; align-items:center; gap:4px; width:42px; height:42px; border:1px solid var(--line); border-radius:10px; background:#101010; } #menu-btn span { display:block; width:16px; height:1.5px; background:var(--fg); border-radius:1px; transition:transform .2s ease, opacity .2s ease; } #menu-btn[aria-expanded=true] span:nth-child(1) { transform:translateY(5.5px) rotate(45deg); } #menu-btn[aria-expanded=true] span:nth-child(2) { opacity:0; } #menu-btn[aria-expanded=true] span:nth-child(3) { transform:translateY(-5.5px) rotate(-45deg); } header { padding-bottom:14px; } .workspace { padding-top:18px; } .workspace { padding-top:22px; } h2 { font-size:22px; } #s-general .section-content,.two { grid-template-columns:1fr; } .setting-row { min-height:0; padding:18px; } #s-age { display:block; padding:18px; } #s-age .note { margin:10px 0 0; } #s-age .f { margin-top:18px; } #s-meta .section-content,#s-jellyfin .section-content,#s-search .section-content { padding:20px; } .svc { padding:20px; } }
@media(max-width:700px) { #s-meta .section-content,#s-jellyfin .section-content,#s-search .section-content { padding:0; } }
.tracking-storage { padding:0 0 18px; margin:0 0 24px; border-bottom:1px solid var(--line); }
.tracking-storage h3 { margin:0 0 8px; }
.tracking-storage .note { margin:0 0 8px; }
.tracking-storage .hint { margin:0; }
.tracker-service .svc > .f:last-child { margin-bottom:0; }
/* Shared layout rhythm and dedicated library management surfaces. */
main { max-width:1120px; padding-bottom:64px; }
.tabs-row { gap:24px; padding-bottom:20px; border-bottom:1px solid var(--faint); }
.tabs { gap:4px; }
.tabs button { padding:9px 12px; }
.workspace { padding-top:36px; }
h2 { font-size:28px; margin-bottom:10px; }
h3 { font-size:16px; font-weight:600; }
.section-content > .note:first-child { margin-bottom:28px; }
.section-intro { max-width:680px; }
.two { column-gap:24px; row-gap:8px; }
#s-general .section-content { gap:20px; }
.f { margin-bottom:22px; }
.b { display:flex; flex-wrap:wrap; align-items:center; gap:12px; }
.b > .hint { margin:0; }
.b > .select-control { flex:1 1 180px; max-width:300px; }
.b > strong { margin-right:auto; }
.group { padding:22px; margin-bottom:20px; }
.group > .b + .f,.group > .b + .two { margin-top:20px; }
.list { gap:8px; }
.item { padding:16px; gap:16px; }
.gname { padding:0 0 16px; font-size:14px; font-weight:600; color:var(--fg); }
#catalogs .group .list { margin:0; }
.catalog-source-heading { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; padding-bottom:16px; }
.catalog-source-heading .gname { padding:0; }
.catalog-source-heading .check { margin:0; font-size:13px; }
.catalog-toolbar { margin:0 0 24px; gap:20px; }
#catalog-picker { margin-bottom:32px; }
.service-card { margin:16px 0; border-radius:12px; }
.service-card .svc { padding:24px; }
.service-card[open] summary { border-bottom:1px solid var(--line); }
.svc > .b { margin:20px 0; }
.svc .row + .row { margin-top:16px; }
.settings-card { padding:28px; border:1px solid var(--line); background:#111; border-radius:14px; margin-bottom:28px; }
.update-history { list-style:none; padding:0; margin:16px 0; }
.update-history li { padding:16px 0; border-top:1px solid var(--line); }
.update-history-head { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; }
.update-history .hint { margin:8px 0 0; overflow-wrap:anywhere; }
.update-history details { margin-top:10px; }
.update-result { font-size:12px; border:1px solid var(--line); border-radius:6px; padding:4px 10px; }
.update-result[data-status=succeeded] { color:#a9dbb6; border-color:#345d40; }
.update-result[data-status=failed],.update-result[data-status=request_failed] { color:#f1b4b4; border-color:#683b3b; }
.update-overview { margin:18px 0; }
#s-updates { scroll-margin-top:160px; }
.card-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin-bottom:24px; }
.card-heading h3 { margin:0; display:flex; align-items:center; gap:10px; }
.card-heading .hint { margin:6px 0 0; }
.card-symbol { font-size:25px; color:var(--mute); line-height:1; }
.count-badge { display:inline-grid; place-items:center; min-width:26px; height:24px; padding:0 7px; border:1px solid #383838; border-radius:6px; color:#aaa; font-size:12px; font-weight:500; }
.addon-form-actions { display:grid; grid-template-columns:minmax(180px,300px) auto; align-items:end; justify-content:space-between; gap:24px; }
.addon-form-actions .f { margin:0; }
button.primary { background:var(--fg); color:#141414; border-color:var(--fg); min-height:46px; padding-inline:24px; }
button.primary:hover { background:#d5d5d5; }
#addon-url { min-height:84px; }
#addon-url-hint { margin-bottom:0; }
#s-addons .b { margin:0; justify-content:flex-start; }
#addon-list { display:grid; gap:16px; }
.addon-card { padding:20px; background:#171717; border:1px solid #2c2c2c; border-radius:10px; min-width:0; }
.addon-card-main { display:flex; align-items:center; gap:16px; }
.addon-icon { display:grid; place-items:center; width:44px; height:44px; flex:none; border:1px solid #3c3c3c; border-radius:10px; background:#222; color:#ccc; font-size:18px; }
.addon-identity { flex:1; min-width:0; }
.addon-identity strong { display:block; font-size:14px; overflow-wrap:anywhere; }
.addon-identity small { display:block; color:var(--mute); font-size:12px; margin-top:3px; overflow-wrap:anywhere; }
.addon-badges { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
.addon-actions button { padding:9px 14px; }
.remove-addon { color:#bcbcbc; background:transparent; }
.addon-details { border-top:1px solid #2c2c2c; margin-top:18px; padding-top:12px; }
.addon-details summary { color:var(--mute); cursor:pointer; font-size:12px; width:fit-content; }
.addon-details .checks { gap:16px 24px; margin:20px 0; }
.addon-manifest { display:grid; gap:8px; color:var(--mute); font-size:12px; }
.addon-manifest input { font-size:12px; }
#s-addons #addon-undo-row { margin-top:20px; }
.empty-state { padding:28px 20px; text-align:center; border:1px dashed #333; border-radius:10px; }
.empty-state strong { display:block; font-size:14px; font-weight:500; }
.empty-state p { color:var(--mute); font-size:13px; max-width:410px; margin:8px auto 0; }
.empty-symbol { display:block; font-size:26px; color:#777; margin-bottom:10px; }
.destination-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
.destination-card { display:flex; justify-content:space-between; gap:20px; padding:22px; border:1px solid var(--line); border-radius:12px; text-decoration:none; background:#101010; }
.destination-card:hover { background:#171717; border-color:#4a4a4a; }
.destination-card strong { font-size:14px; font-weight:500; }
.destination-card small { display:block; color:var(--mute); font-size:12px; margin-top:6px; }
.full-width { grid-column:1 / -1; }
@media(min-width:701px) and (max-width:1050px) { .tabs-row { flex-wrap:wrap; gap:14px; } .tabs-row .tabs { flex-basis:100%; } }
@media(max-width:700px) {
  main { padding-inline:18px; } .workspace { padding-top:26px; } h2 { font-size:25px; }
  .settings-card { padding:20px; margin-bottom:20px; } .card-heading { margin-bottom:22px; }
  .destination-grid { grid-template-columns:1fr; gap:12px; }
  .addon-form-actions { grid-template-columns:1fr; gap:18px; }
  .addon-card { padding:16px; } .addon-card-main { flex-wrap:wrap; align-items:flex-start; gap:12px; }
  .addon-identity { flex-basis:calc(100% - 60px); } .addon-actions { width:100%; padding-top:4px; }
  .addon-actions button { flex:1; } .group,.service-card .svc,#jf-collections > .svc { padding:18px; }
  .item { gap:12px; padding:14px 12px; } .ud { gap:0; } .ud button { width:32px; }
  .b { gap:12px; } .b > .select-control { max-width:none; }
  .catalog-toolbar { flex-wrap:wrap; gap:10px; } .catalog-toolbar input { flex-basis:100%; }
}

/* Collections: compact overview, with one focused editor at a time. */
.collection-toolbar { display:flex; align-items:flex-start; gap:16px; justify-content:space-between; margin:24px 0; }
.collection-tools { font-size:13px; color:var(--mute); }
.collection-tools > summary { cursor:pointer; padding:12px 0; }
.collection-tools .b { margin:8px 0; }
.collection-empty { padding:28px 0; border-top:1px solid var(--line); }
.collection-empty strong { font-size:14px; font-weight:500; }
.collection-empty p { font-size:13px; color:var(--mute); margin:6px 0 0; }
#collection-import,#collection-export-text { margin:20px 0; }
#collection-import .b { margin-top:12px; }
#jf-collections { max-width:880px; }
.collection-list-row { display:flex; align-items:center; gap:16px; padding:18px 0; border-bottom:1px solid var(--line); }
.collection-list-row:first-child { border-top:1px solid var(--line); }
.collection-row-title { min-width:0; flex:1; }
.collection-row-title strong { display:block; font-size:14px; font-weight:500; overflow-wrap:anywhere; }
.collection-row-title small { display:block; margin-top:4px; color:var(--mute); font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.collection-editor-nav { display:flex; align-items:center; justify-content:space-between; gap:16px; margin:18px 0 24px; }
.collection-editor-nav > button { background:none; border:0; padding:4px 0; color:var(--mute); }
.collection-editor-nav .hint { margin:0; font-size:12px; }
#jf-collections > .f { max-width:520px; margin-bottom:26px; }
.collection-group-heading { display:flex; justify-content:space-between; align-items:center; gap:16px; margin:0 0 16px; }
.collection-group-heading h3 { margin:0; font-size:14px; }
.collection-group-heading .hint { margin:4px 0 0; font-size:12px; }
.collection-inline-empty { margin:0 0 22px; padding:18px 0; border-top:1px solid var(--line); color:var(--mute); font-size:13px; }
.collection-group { border:1px solid var(--line); border-radius:8px; margin:10px 0; background:#101010; }
.collection-group-summary { display:flex; align-items:center; gap:16px; padding:14px 16px; }
.collection-group-summary button { padding:7px 13px; }
.collection-group.editing { border-color:#484848; }
.collection-group-editor { border-top:1px solid var(--line); padding:16px; }
.collection-group-editor > .f { margin-bottom:16px; }
.collection-composer { display:grid; grid-template-columns:minmax(140px,200px) minmax(0,1fr); gap:12px; margin:16px 0; align-items:start; }
.collection-source-choice:empty { display:none; }
.collection-source-choice > .f { margin:0; }
.collection-source-choice .hint { margin:8px 0 0; }
.collection-source-choice .b { gap:8px; margin-top:8px; }
.collection-disclosure { border-top:1px solid var(--line); margin-top:16px; }
.collection-disclosure > summary { cursor:pointer; padding:14px 0; color:var(--mute); font-size:13px; }
.collection-disclosure > .two,.collection-disclosure > .b,.collection-disclosure > textarea,.collection-disclosure > .select-control { margin-top:8px; }
.collection-disclosure > .b { margin-bottom:18px; }
.collection-disclosure > .f { margin-top:8px; }
.collection-disclosure .collection-disclosure { margin-top:6px; }
.collection-group-actions { margin-top:16px; gap:8px; }
.collection-group-actions button { font-size:12px; padding:7px 10px; background:none; }
.collection-group-actions button:last-child { margin-left:auto; }
.collection-source { padding:10px 0; border-bottom:1px solid #262626; }
.collection-source-row { display:flex; gap:10px; align-items:center; }
.collection-source-row > span { flex:1; min-width:0; font-size:13px; overflow-wrap:anywhere; }
.collection-source-row button { width:30px; height:30px; padding:0; border:0; background:none; color:var(--mute); }
.collection-source > .collection-disclosure { border:0; margin:0; }
.collection-source > .collection-disclosure > summary { padding:6px 0 0; font-size:12px; }
@media(max-width:700px) {
  .collection-toolbar { gap:12px; } .collection-toolbar .primary { padding-inline:16px; }
  .collection-editor-nav { flex-wrap:wrap; gap:6px; }
  .collection-group-heading .hint { max-width:210px; }
  .collection-group-heading > button { flex:none; padding:9px 12px; }
  .collection-group-editor { padding:14px; } .collection-composer { grid-template-columns:1fr; }
  .collection-list-row { gap:8px; } .collection-list-row > button { padding:8px 12px; }
  .collection-list-row .ud button { width:28px; }
}

/* Collection artwork stays in the same horizontal row as the library. */
.art-workbench { display:flex; flex-direction:column; gap:24px; }
.art-controls { min-width:0; width:100%; border-top:1px solid var(--line); padding-top:22px; }
.art-editor-heading { display:flex; align-items:center; gap:14px; margin-bottom:18px; }
.art-editor-heading h3 { margin:0; font-size:16px; }
.art-editor-heading .art-image { width:52px; flex:none; }
.art-context { font-size:12px; color:var(--mute); }
.art-shape-field { margin:0 0 18px; }
.art-shapes { display:flex; flex-wrap:wrap; gap:8px; }
.art-shapes button { display:flex; align-items:center; gap:8px; padding:8px 12px; background:none; color:var(--mute); border-color:#303030; font-size:12px; }
.art-shapes button[aria-pressed=true] { background:#222; color:var(--fg); border-color:#999; }
.art-shapes button small { color:var(--mute); font-size:11px; font-weight:400; }
.shape-outline { display:block; height:16px; width:11px; border:1px solid currentColor; border-radius:2px; }
.shape-outline[data-shape=square] { width:16px; }
.shape-outline[data-shape=landscape] { width:24px; }
.art-shape-field > button { background:none; border:0; padding:8px 0 0; color:var(--mute); font-size:12px; }
.art-url-field { margin:0 0 16px; }
.art-url-field .t { font-size:13px; margin-bottom:8px; }
.art-url-control { display:flex; gap:8px; align-items:center; }
.art-url-control input { flex:1; min-width:0; }
.art-url-control button { background:none; padding:8px 10px; color:var(--mute); }
.art-image-status { color:var(--mute); font-size:11px; line-height:1.6; margin:6px 0 0; min-height:18px; }
.art-url-control [aria-invalid=true] { border-color:#c58573; }
.art-image { position:relative; display:grid; place-items:center; aspect-ratio:2/3; min-width:0; width:100%; overflow:hidden; background:#181818; border:1px solid #ffffff0c; border-radius:5px; }
.art-image[data-shape=square] { aspect-ratio:1; }
.art-image[data-shape=landscape] { aspect-ratio:16/9; }
.art-image > img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.art-placeholder { display:flex; flex-direction:column; align-items:center; gap:8px; color:#777; text-align:center; padding:8px; }
.art-placeholder > span { font-size:25px; }
.art-placeholder small { font-size:10px; max-width:130px; }
.boxset-preview { min-width:0; width:100%; }
.boxset-preview-heading { display:flex; align-items:baseline; justify-content:space-between; gap:16px; margin-bottom:14px; }
.boxset-preview-heading h3 { font-size:16px; font-weight:500; margin:0; }
.boxset-preview-heading small { color:var(--mute); font-size:11px; }
.boxset-preview-note { color:var(--mute); font-size:11px; line-height:1.6; margin:8px 0 0; }
.boxset-count { color:var(--mute); font-weight:400; margin-left:8px; }
.boxset-row { position:relative; scrollbar-width:thin; scrollbar-color:#444 transparent; display:flex; align-items:flex-start; gap:18px; overflow-x:auto; padding:3px 3px 12px; scroll-snap-type:x proximity; }
.boxset-card { flex:none; width:120px; padding:0; background:none; border:0; border-radius:0; text-align:left; scroll-snap-align:start; transition:none; }
.boxset-card:hover,.boxset-card:focus,.boxset-card:active:not(:disabled) { background:none; border:0; box-shadow:none; transform:none; }
.boxset-card:focus-visible { outline:none; }
.boxset-card > .art-image:after { content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none; }
.boxset-card:focus-visible > .art-image:after { box-shadow:inset 0 0 0 2px #aaa; }
.boxset-card:hover > strong { color:#fff; }
.boxset-card[data-shape=square] { width:180px; }
.boxset-card[data-shape=landscape] { width:320px; }
.boxset-card > .art-image { height:180px; }
.boxset-card[aria-pressed=true] > strong { text-decoration:underline; text-decoration-color:#999; text-decoration-thickness:1px; text-underline-offset:5px; }
.boxset-card > strong { display:block; margin-top:10px; font-size:13px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.boxset-card > small { display:block; margin-top:4px; font-size:11px; color:var(--mute); font-weight:400; }
.art-secondary-preview { display:flex; gap:16px; align-items:center; margin-bottom:16px; }
.art-secondary-preview:empty { display:none; }
.art-secondary-preview .art-image { width:150px; }
.art-logo-preview > img { object-fit:contain; }
.art-thumbnail { padding:0; width:40px; flex:none; border:0; background:none; }
.art-thumbnail .art-placeholder small { display:none; }
.art-thumbnail .art-placeholder { padding:0; }
.art-thumbnail .art-placeholder > span { font-size:16px; }
.collection-visual-identity { display:flex; align-items:center; gap:16px; margin:0 0 28px; }
.collection-visual-identity > .f { flex:1; margin:0; max-width:520px; }
.collection-visual-identity > .art-thumbnail { width:48px; }
.collection-visual-identity > button:last-child { align-self:flex-end; }
.collection-group { background:none; border:0; border-top:1px solid var(--line); border-radius:0; margin:20px 0; }
.collection-group-summary { padding:18px 0; }
.collection-group-editor { padding:20px 0 0; border:0; }
.collection-boxset-name { display:flex; gap:16px; align-items:flex-end; margin-bottom:16px; }
.collection-boxset-name > .f { flex:1; min-width:0; margin:0; }
.collection-boxset-name > button { flex:none; }
.collection-group-summary h3 { margin:0; font-size:16px; }
.collection-catalog-picker { margin:16px 0; }
.collection-catalog-picker > .select-control { width:100%; }
@media(max-width:700px) {
 .art-workbench { gap:18px; }
 .boxset-row { gap:14px; }
 .boxset-card { width:88px; }
 .boxset-card[data-shape=square] { width:132px; }
 .boxset-card[data-shape=landscape] { width:235px; }
 .boxset-card > .art-image { height:132px; }
 .art-shapes { gap:6px; }
 .art-shapes button { padding:8px; gap:5px; }
 .art-shapes button small { display:none; }
 .collection-visual-identity { gap:10px; flex-wrap:wrap; }
 .collection-visual-identity > .f { flex-basis:calc(100% - 64px); }
 .collection-visual-identity > button:last-child { margin-left:58px; padding:7px 12px; }
 .collection-list-row > .art-thumbnail { width:32px; }
 .art-context { font-size:11px; }
}

`;

function brand(welcome = false, heading = true): string {
  const tag = heading ? 'h1' : 'span';
  return `<div class="brand${welcome ? ' brand-welcome' : ''}"><img class="brand-cat" src="/logo.svg?v=${BRAND_VERSION}" alt="" width="44" height="51"><${tag} class="wordmark"><img class="brand-wordmark" src="/wordmark.svg?v=${BRAND_VERSION}" alt="Rill" width="90" height="38"></${tag}></div>`;
}

function body(): string {
  return `
<main>
<div id="setup-gate" hidden><form id="setup-form" autocomplete="on">${brand(true)}<h2>Create your account</h2><p class="note">One account protects this page and signs you in from Jellyfin apps. Your settings are stored on your Worker and follow you to every device.</p><div class="f"><label class="t" for="setup-user">Username</label><input type="text" id="setup-user" name="username" autocomplete="username" autocapitalize="off" spellcheck="false" required></div><div class="f"><label class="t" for="setup-pass">Password</label><input type="password" id="setup-pass" name="password" autocomplete="new-password" minlength="8" required><p class="hint">At least 8 characters.</p></div><div class="f"><label class="t" for="setup-pass2">Confirm password</label><input type="password" id="setup-pass2" autocomplete="new-password" minlength="8" required></div><button type="submit" id="setup-submit">Create account</button><p class="status" id="setup-status" role="alert"></p></form></div>
<div id="login-gate" hidden><form id="login-form" autocomplete="on">${brand(true)}<p class="note">Sign in with your Jellyfin username and password to open your settings.</p><div class="f"><label class="t" for="login-user">Username</label><input type="text" id="login-user" name="username" autocomplete="username" autocapitalize="off" spellcheck="false" required></div><div class="f"><label class="t" for="login-pass">Password</label><input type="password" id="login-pass" name="password" autocomplete="current-password" required></div><button type="submit" id="login-submit">Sign in</button><p class="status" id="login-status" role="alert"></p></form></div>
<header>
  <div class="brand-row">${brand()}<div class="header-actions"><span id="draft-status" role="status" hidden>Saved on this device</span><div id="account" class="account"></div><button type="button" id="menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="drawer"><span></span><span></span><span></span></button></div></div>
  <div class="tabs-row">
  <nav class="tabs" role="tablist" aria-label="Configuration sections">
    ${[['general','General'],['addons','Add-ons'],['catalogs','Catalogs'],['collections','Collections'],['jellyfin','Jellyfin'],['meta','Metadata'],['tracking','Scrobbling'],['install','Connect']].map(([id,label],i) => `<button type="button" role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${i===0}" tabindex="${i===0?0:-1}" data-tab="${id}"${id==='meta'||id==='tracking'?' data-advanced':''}>${label}</button>`).join('')}
  </nav>
  <div class="mode" role="group" aria-label="Settings mode"><label><input type="radio" name="mode" value="simple" id="mode-simple"><span>Simple</span></label><label><input type="radio" name="mode" value="advanced" id="mode-advanced"><span>Advanced</span></label></div>
  </div>
</header>
<div id="drawer-backdrop" hidden></div>
<aside id="drawer" hidden aria-label="Menu">
  <div class="drawer-head">${brand(false, false)}<button type="button" id="drawer-close" aria-label="Close menu">✕</button></div>
  <div id="drawer-account"></div>
  <nav id="drawer-nav" class="drawer-nav" aria-label="Sections"></nav>
  <div class="drawer-mode"><span class="t">Mode</span><div class="seg" role="group" aria-label="Settings mode"><button type="button" data-mode="simple" aria-pressed="false">Simple</button><button type="button" data-mode="advanced" aria-pressed="false">Advanced</button></div></div>
</aside>
<div class="workspace"><div id="panels">

<section id="s-general">
  <h2><small>1</small>General</h2>
  <div class="setting-row"><div><label class="t" for="name">Display name</label><p class="hint">The server name shown in your apps.</p></div><div class="f"><input type="text" id="name" data-k="name" autocomplete="off" spellcheck="false"></div></div>
  <div class="setting-row"><div><label class="t" for="language">Language</label><p class="hint">For titles, descriptions and artwork.</p></div><div class="f"><input type="text" id="language" data-k="language" list="langs" autocomplete="off" spellcheck="false" placeholder="en-US"><datalist id="langs">${LANGUAGES.map((l) => `<option value="${l}">`).join('')}</datalist></div></div>
</section>

<section id="s-updates">
  <h2>Updates</h2>
  <div class="settings-card">
    <p class="note">Get the latest Rill improvements. Your account, settings and watch history stay in place.</p>
    <div class="b"><button type="button" class="primary" id="update-start" disabled>Update Rill</button><button type="button" class="q" id="update-refresh" disabled>Refresh status</button><a href="https://dash.cloudflare.com/?to=/:account/workers-and-pages" target="_blank" rel="noopener noreferrer">View Cloudflare builds ↗</a></div>
    <p class="status" id="update-status" role="status" aria-live="polite">Sign in to manage updates.</p>
    <p class="hint update-overview" id="update-overview"></p>
    <h3>Recent updates</h3>
    <p class="hint" id="update-history-note">Sign in to see your update history.</p>
    <ol class="update-history" id="update-history" aria-label="Update history"></ol>
    <details id="update-settings">
      <summary id="update-settings-label">Connect updates</summary>
      <p class="note">Connect Cloudflare once, then update here with one click.</p>
      <ol class="note">
        <li>Open your Worker in Cloudflare and go to <strong>Settings → Builds → Deploy Hooks</strong>.</li>
        <li>Create a hook named <strong>Rill updates</strong> for your production branch (usually <strong>main</strong>).</li>
        <li>Copy its URL and paste it below.</li>
      </ol>
      <div class="f"><label class="t" for="update-hook">Cloudflare Deploy Hook URL</label><input type="password" id="update-hook" autocomplete="off" spellcheck="false" placeholder="Paste your hook URL"><p class="hint">Stored privately on your server. Leave blank to keep your saved connection.</p></div>
      <label class="note"><input type="checkbox" id="update-daily"> Update automatically each day at 04:17 UTC</label>
      <div class="b"><button type="button" id="update-save" disabled>Connect updates</button><button type="button" class="q" id="update-disconnect" hidden>Disconnect</button></div>
      <p class="hint">Updates change your running Rill installation. Your GitHub copy stays unchanged.</p>
    </details>
    <details id="update-monitor-settings">
      <summary>Build results in Rill</summary>
      <p class="note">Optionally connect read-only access to see queued, running, succeeded, failed, and canceled builds here. Your Deploy Hook continues to work without this.</p>
      <p class="hint">Create a user API token with <strong>Workers Builds Configuration: Read</strong> and <strong>Workers Scripts: Read</strong>, limited to your account. Cloudflare also calls the builds permission <strong>Workers CI Read</strong>.</p>
      <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener noreferrer">Create a read-only token ↗</a>
      <div class="f"><label class="t" for="update-account-id">Cloudflare account ID</label><input type="text" id="update-account-id" autocomplete="off" spellcheck="false"><p class="hint">The 32-character account ID in your Cloudflare dashboard address.</p></div>
      <div class="f"><label class="t" for="update-worker">Worker name</label><input type="text" id="update-worker" autocomplete="off" spellcheck="false" placeholder="For example, rill"></div>
      <div class="f"><label class="t" for="update-token">Read-only API token</label><input type="password" id="update-token" autocomplete="off" spellcheck="false"><p class="hint">Stored privately on your server. Leave blank to keep the saved token.</p></div>
      <div class="b"><button type="button" id="update-monitor-save" disabled>Connect build results</button><button type="button" class="q" id="update-monitor-remove" hidden>Disconnect build results</button></div>
    </details>
  </div>
</section>

<section id="s-meta">
  <h2><small>2</small>Metadata</h2>
  <h3>API keys</h3>
  <p class="note">Everything below that needs a key stays locked until you add it. Free sources such as Cinemeta, Metahub, TVmaze and the anime sites work without keys.</p>
  <div class="two">
    <div class="f"><div class="key-row"><label class="t" for="k-tmdb">TMDB</label><span class="pill" data-key-status="tmdb">Not set</span></div><input type="password" id="k-tmdb" data-k="keys.tmdb" class="key" autocomplete="off"><a class="key-link" href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener">Get a TMDB key ↗</a></div>
    <div class="f"><div class="key-row"><label class="t" for="k-tvdb">TVDB</label><span class="pill" data-key-status="tvdb">Not set</span></div><input type="password" id="k-tvdb" data-k="keys.tvdb" class="key" autocomplete="off"><a class="key-link" href="https://thetvdb.com/api-information" target="_blank" rel="noopener">Get a TVDB key ↗</a></div>
    <div class="f"><div class="key-row"><label class="t" for="k-fanart">Fanart.tv</label><span class="pill" data-key-status="fanart">Not set</span></div><input type="password" id="k-fanart" data-k="keys.fanart" class="key" autocomplete="off"><a class="key-link" href="https://fanart.tv/get-an-api-key/" target="_blank" rel="noopener">Get a Fanart.tv key ↗</a></div>
    <div class="f"><div class="key-row"><label class="t" for="k-rpdb">RPDB</label><span class="pill" data-key-status="rpdb">Not set</span></div><input type="password" id="k-rpdb" data-k="keys.rpdb" class="key" autocomplete="off"><a class="key-link" href="https://ratingposterdb.com/" target="_blank" rel="noopener">Get a RPDB key ↗</a></div>
  </div>
  <p class="hint"><button class="q" type="button" id="show-keys">Show keys</button> Keys are stored on your Worker and forwarded only to their providers.</p>
  <p class="hint">Adding a TMDB key automatically fills missing Jellyfin details for matched titles, including cast photos, character names, biographies and related titles. Works with metadata add-ons, even when Providers is set to Off. Existing add-on details and episode numbering are preserved.</p>
  <h3>Providers</h3>
  <div class="two">
    <div class="f"><label class="t" for="p-movie">Movies</label><div class="sel"><select id="p-movie" data-k="providers.movie">${options(PROVIDER_OPTS)}</select></div></div>
    <div class="f"><label class="t" for="p-series">Series</label><div class="sel"><select id="p-series" data-k="providers.series">${options(PROVIDER_OPTS)}</select></div></div>
    <div class="f"><label class="t" for="p-anime">Anime</label><div class="sel"><select id="p-anime" data-k="providers.anime">${options(ANIME_OPTS)}</select></div></div>
  </div>
  <p class="note">Optional metadata providers start off. With Off selected, your add-ons supply the details. Choose a provider to override them.</p>
  <h3>Artwork priority</h3>
  <p class="note">All artwork overrides start off. Enable the sources you want, top first. With none selected, the original title artwork is kept.</p>
  <label class="t">Posters</label>
  <div class="list" data-order="artwork.posters" data-options="tmdb,fanart,tvdb,rpdb,metahub"></div>
  <label class="t">Backgrounds</label>
  <div class="list" data-order="artwork.backgrounds" data-options="tmdb,fanart,tvdb,metahub"></div>
  <label class="t">Logos</label>
  <div class="list" data-order="artwork.logos" data-options="fanart,tmdb,tvdb,metahub"></div>
</section>

<section id="s-catalogs">
  <h2><small>3</small>Catalogs</h2>
  <p class="note">Added add-ons appear first and their catalogs start enabled. Services appear below, disabled by default; those requiring a key appear after you add it. Use each source’s toggle to enable or disable all its catalogs, and the arrows to arrange them.</p>
  <div id="catalog-picker">
  <div class="catalog-toolbar"><input type="text" id="catalog-filter" aria-label="Filter catalogs" placeholder="Search catalogs" autocomplete="off" spellcheck="false"><span id="catalog-count" role="status"></span></div>
  <div id="catalogs"></div>
  <p id="catalog-empty" hidden>No matching catalogs.</p>
  <p class="status" id="cat-status"></p>
  </div>
  <details class="service-card catalog-settings" data-advanced><summary>Your lists</summary><div class="svc">
  <div class="two">
    <div class="f" data-needs="mdblist"><label class="t" for="l-mdblist">MDBList list ids</label><textarea id="l-mdblist" data-lines="lists.mdblist" placeholder="one per line" spellcheck="false"></textarea><p class="hint">Add your MDBList key in Scrobbling.</p></div>
    <div class="f" data-needs="trakt"><label class="t" for="l-trakt">Trakt list ids</label><textarea id="l-trakt" data-lines="lists.trakt" placeholder="user/list-slug, one per line" spellcheck="false"></textarea><p class="hint">Requires a Trakt client ID.</p></div>
    <div class="f" data-needs="publicmetadb"><label class="t" for="l-pmdb">PublicMetaDB list IDs</label><textarea id="l-pmdb" data-lines="lists.publicmetadb" placeholder="one per line" spellcheck="false"></textarea></div>
    <div class="f" data-needs="publicmetadb"><label class="t" for="l-pmdb-picks">PublicMetaDB pick IDs</label><textarea id="l-pmdb-picks" data-lines="lists.publicmetadbPicks" placeholder="one per line" spellcheck="false"></textarea></div>
    <div class="f" data-needs="tmdb"><label class="t" for="l-tmdb-collections">TMDB collections</label><textarea id="l-tmdb-collections" data-lines="lists.tmdbCollections" placeholder="Collection links or IDs, one per line"></textarea></div>
    <div class="f" data-needs="tvdb"><label class="t" for="l-tvdb">TVDB lists</label><textarea id="l-tvdb" data-lines="lists.tvdb" placeholder="List links or IDs, one per line" spellcheck="false"></textarea></div>
    <div class="f"><label class="t" for="l-letterboxd">Letterboxd lists and watchlists</label><textarea id="l-letterboxd" data-lines="lists.letterboxd" placeholder="List or watchlist links, one per line" spellcheck="false"></textarea></div>
    <div class="f"><label class="t" for="l-flixpatrol">FlixPatrol regions</label><textarea id="l-flixpatrol" data-lines="lists.flixpatrol" placeholder="global&#10;romania&#10;united-states" spellcheck="false"></textarea><p class="hint">One region per line. Available charts appear above.</p></div>
  </div>
  </div></details>
  <details class="service-card catalog-settings" data-advanced><summary>MovieLens</summary><div class="svc">
  <div class="two">
    <div class="f"><label class="t" for="ml-user">Username</label><input type="text" id="ml-user" data-k="movieLens.username" autocomplete="off" spellcheck="false"></div>
    <div class="f"><label class="t" for="ml-pass">Password</label><input id="ml-pass" type="password" data-k="movieLens.password" autocomplete="off"></div>
    <label class="check"><input type="checkbox" data-k="movieLens.syncRatings">Import ratings daily from connected Trakt, Simkl and MDBList accounts</label>
    <div class="b"><button type="button" id="ml-sync">Import ratings now</button><button type="button" id="ml-status">Check last import</button></div>
    <div class="f"><label class="t" for="ml-csv">Import an IMDb ratings CSV</label><input id="ml-csv" type="file" accept=".csv,text/csv"></div>
    <span id="ml-result" class="hint" role="status"></span>
  </div>
  </div></details>
  <details class="service-card catalog-settings" data-advanced><summary>Custom catalogs</summary><div class="svc">
  <p class="note">Build discovery lists or combine existing catalogs in the order you choose.</p>
  <div id="custom-catalogs"></div>
  <button type="button" id="add-custom-catalog">Add catalog</button>
  </div></details>
  <details class="service-card catalog-settings" data-advanced><summary>Recommendations</summary><div class="svc">
  <p class="note">Optional AI recommendations use your viewing history with the provider you choose. Provider charges apply when a taste profile or recommendation list is generated.</p>
  <div id="rec-req" class="reqs"></div>
  <label class="check"><input type="checkbox" data-k="recommendations.enabled">Enable recommendations</label>
  <label class="check"><input type="checkbox" data-k="recommendations.aiSearch">Enable AI search with the prefix “ai:”</label>
  <p class="hint">For example: ai: thoughtful science fiction about first contact. Each uncached request uses your chosen AI provider.</p>
  <div class="two">
    <div class="f"><label class="t" for="rec-provider">Provider</label><select id="rec-provider" data-k="recommendations.provider"><option value="gemini">Gemini</option><option value="openrouter">OpenRouter</option></select></div>
    <div class="f"><label class="t" for="rec-sources">Viewing history</label><select id="rec-sources" data-k="recommendations.sources"><option value="both">Simkl and MDBList</option><option value="simkl">Simkl</option><option value="mdblist">MDBList</option><option value="primary">Primary tracker</option></select><p class="hint">Local playback history is included. Independent profiles use only their own history.</p></div>
    <div class="f"><label class="t" for="rec-key">API key</label><input id="rec-key" type="password" data-k="recommendations.apiKey" autocomplete="off"></div>
    <div class="f"><label class="t" for="rec-model">Model</label><input type="text" id="rec-model" data-k="recommendations.model" placeholder="Your provider's model name" autocomplete="off" spellcheck="false"></div>
    <div class="f"><label class="t" for="rec-reasoning">Reasoning effort</label><select id="rec-reasoning" data-k="recommendations.reasoning"><option value="minimal">Minimal</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
    <div class="f"><label class="t" for="rec-order">Order</label><select id="rec-order" data-k="recommendations.order"><option value="balanced">Balance rating and audience</option><option value="suggested">Suggested order</option><option value="popular">Most popular</option><option value="acclaimed">Highest rated</option></select></div>
    <div class="f"><label class="t" for="rec-hours">Refresh</label><select id="rec-hours" data-k="recommendations.refreshHours"><option value="6">Every 6 hours</option><option value="12">Every 12 hours</option><option value="24">Daily</option></select></div>
    <div class="f"><label class="t" for="rec-votes">Minimum votes</label><input id="rec-votes" type="number" min="0" data-k="recommendations.minVotes"></div>
    <div class="f"><label class="t" for="rec-stalled">Unfinished titles</label><select id="rec-stalled" data-k="recommendations.stalledWeight"><option value="ignore">Ignore inactivity</option><option value="note">Treat inactivity neutrally</option><option value="mild">Weak sign of disinterest</option><option value="dislike">Treat inactivity as dislike</option></select></div>
    <div class="f"><label class="t" for="rec-days">Days before considering a title inactive</label><input id="rec-days" type="number" min="7" data-k="recommendations.staleDays"></div>
  </div>
  <label class="check"><input type="checkbox" data-k="recommendations.webSearch">Search for recent releases</label>
  <div class="b"><button type="button" id="prepare-recommendations">Prepare recommendations</button><button type="button" id="rebuild-recommendations">Rebuild from history</button><button type="button" id="check-recommendations">Check progress</button><span id="rec-status" class="hint" role="status"></span></div>
  </div></details>
  <p class="hint" data-simple-catalog-note>Switch to Advanced for custom lists, MovieLens and recommendations.</p>
</section>

<section id="s-addons">
  <h2>Add-ons</h2>
  <p class="note section-intro">Connect the sources that bring your library to life. Add a source below, then manage it in one place.</p>
  <div class="settings-card">
    <div class="card-heading"><div><h3>Add an add-on</h3><p class="hint">Paste a Stremio manifest link. We’ll detect what it provides.</p></div><span class="card-symbol" aria-hidden="true">+</span></div>
    <form id="addon-form">
      <div class="f"><label class="t" for="addon-url">Manifest link</label><textarea id="addon-url" rows="2" placeholder="https://your-addon.com/manifest.json" spellcheck="false" required aria-describedby="addon-url-hint"></textarea><p class="hint" id="addon-url-hint">Adding several? Put each link on a new line.</p></div>
      <div class="addon-form-actions"><div class="f"><label class="t" for="addon-kind">Use for</label><select id="addon-kind"><option value="auto">Detect automatically</option><option value="catalog">Catalogs</option><option value="meta">Metadata</option><option value="stream">Streams</option><option value="subtitle">Subtitles</option></select></div><button class="primary" id="addon-submit" type="submit">Add add-on</button></div>
      <p class="status" id="addon-add-status" role="status"></p>
    </form>
  </div>
  <div class="settings-card">
    <div class="card-heading"><div><h3>Added add-ons <span class="count-badge" id="addon-count">0</span></h3><p class="hint">Check a connection, change its role, or remove a source.</p></div></div>
    <div id="addon-list"></div>
    <div class="empty-state" id="addon-empty"><span class="empty-symbol" aria-hidden="true">＋</span><strong>Your sources start here</strong><p>Add your first manifest link above to choose your catalog and metadata sources.</p></div>
    <div class="b" id="addon-undo-row" hidden><span class="hint" id="addon-removed" role="status"></span><button type="button" id="addon-undo">Undo removal</button></div>
  </div>
  <div class="destination-grid">
    <a class="destination-card" href="#catalogs"><span><strong>Catalogs</strong><small>Choose and reorder the rows in your apps.</small></span><span aria-hidden="true">↗</span></a>
    <a class="destination-card" href="#collections"><span><strong>Collections</strong><small>Build themed libraries and box sets.</small></span><span aria-hidden="true">↗</span></a>
  </div>
</section>

<section id="s-tracking">
  <h2><small>5</small>Scrobbling</h2>
  <p class="note section-intro">Your server keeps your watch progress. Trackers are optional.</p>
  <div class="tracking-storage"><h3>Where your progress is stored</h3><p id="tracking-storage-note" class="note"></p><p class="hint">A primary tracker adds its history and receives new watch updates for enabled media types. Server records take precedence. Profiles with separate history stay on the server and do not sync with trackers.</p></div>
  <div class="two">
    <div class="f"><label class="t" for="tr-primary">History source / primary tracker</label><div class="sel"><select id="tr-primary" data-k="trackers.primary"><option value="off">Server only (default)</option><option value="trakt">Trakt</option><option value="simkl">Simkl</option><option value="mdblist">MDBList</option><option value="publicmetadb">PublicMetaDB</option><option value="mal">MyAnimeList</option><option value="anilist">AniList</option></select></div><p class="hint">Used for Continue Watching and watched status. Add the service’s credentials below to select it.</p></div>
    <div class="f"><label class="t">Also send watch updates to</label>
      <div class="checks" id="scrobble">
        <label data-needs="trakt"><input type="checkbox" data-arr="trackers.scrobbleTo" value="trakt"> Trakt</label>
        <label data-needs="simkl"><input type="checkbox" data-arr="trackers.scrobbleTo" value="simkl"> Simkl</label>
        <label data-needs="mdblist"><input type="checkbox" data-arr="trackers.scrobbleTo" value="mdblist"> MDBList</label>
        <label data-needs="publicmetadb"><input type="checkbox" data-arr="trackers.scrobbleTo" value="publicmetadb"> PublicMetaDB</label>
        <label data-needs="mal"><input type="checkbox" data-arr="trackers.scrobbleTo" value="mal"> MyAnimeList</label>
        <label data-needs="anilist"><input type="checkbox" data-arr="trackers.scrobbleTo" value="anilist"> AniList</label>
      </div>
    </div>
  </div>

  <p class="note" id="tracking-sync-status" role="status"></p>
  <details class="service-card"><summary>Sync status and delivery</summary><div class="svc"><p class="note">Server progress is saved as your player reports it. Tracker updates are queued for delivery. PublicMetaDB receives stopped positions; MyAnimeList and AniList receive completed anime progress.</p><div class="b"><button type="button" id="delivery-check">Check delivery status</button><button type="button" id="delivery-retry" hidden>Retry failed updates</button></div><p class="status" id="delivery-status" aria-live="polite"></p></div></details>
  <details class="service-card"><summary>Media types to send</summary><div class="svc"><p class="hint">These filters apply only to trackers enabled above. Checked media types do not enable a tracker.</p>
    ${[['trakt','Trakt'],['simkl','Simkl'],['mdblist','MDBList'],['publicmetadb','PublicMetaDB'],['mal','MyAnimeList'],['anilist','AniList']].map(([key,label]) => `<h3>${label}</h3><div class="checks"><label><input type="checkbox" data-k="trackers.media.${key}.movie"> Movies</label><label><input type="checkbox" data-k="trackers.media.${key}.series"> Series</label></div>`).join('')}
  </div></details>
  <details class="service-card tracker-service" id="svc-trakt"><summary>Trakt</summary><div class="svc">
    <p class="note">Create an app at trakt.tv/oauth/applications with redirect <span class="mono">urn:ietf:wg:oauth:2.0:oob</span>, then paste its id and secret.</p>
    <div class="two">
      <div class="f"><label class="t" for="trakt-id">Client id</label><input type="text" id="trakt-id" data-ui="trakt.clientId" autocomplete="off" spellcheck="false"></div>
      <div class="f"><label class="t" for="trakt-secret">Client secret</label><input type="password" id="trakt-secret" data-ui="trakt.clientSecret" autocomplete="off"></div>
    </div>
    <div class="row"><button type="button" id="trakt-connect">Connect</button><button type="button" id="trakt-refresh">Refresh token</button><button type="button" id="trakt-disconnect">Disconnect</button></div>
    <p class="hint">Refresh here when your token expires. Your server saves the updated credentials.</p>
    <div id="trakt-code" hidden><div class="code" id="trakt-usercode"></div><p class="note">Enter the code at <a id="trakt-verify" target="_blank" rel="noopener"></a>. This page keeps checking until Trakt confirms.</p></div>
    <p class="status" id="trakt-status"></p>
  </div></details>

  <details class="service-card tracker-service" id="svc-mdblist"><summary>MDBList</summary><div class="svc"><p class="note">Use MDBList for watched history and resume positions, or only send it watch updates. This key makes MDBList catalogs available to enable in Catalogs.</p><div class="f"><div class="key-row"><label class="t" for="k-mdblist">MDBList API key</label><span class="pill" data-key-status="mdblist">Not set</span></div><input type="password" id="k-mdblist" data-k="keys.mdblist" autocomplete="off" spellcheck="false"><a class="key-link" href="https://mdblist.com/preferences/" target="_blank" rel="noopener">Get an MDBList key ↗</a></div></div></details>
  <details class="service-card tracker-service" id="svc-publicmetadb"><summary>PublicMetaDB</summary><div class="svc"><p class="note">Use PublicMetaDB for watched history and resume positions, or only send it watch updates. Playback positions are sent when you stop. PublicMetaDB applies its own resume-completion rules.</p><p class="hint">To display imported titles, use an add-on that supports TMDB IDs, or enable TMDB in Metadata.</p><div class="f"><div class="key-row"><label class="t" for="k-publicmetadb">PublicMetaDB API key</label><span class="pill" data-key-status="publicmetadb">Not set</span></div><input type="password" id="k-publicmetadb" data-k="keys.publicmetadb" autocomplete="off" spellcheck="false"><p class="hint">Create a key in PublicMetaDB → Settings → API.</p><a class="key-link" href="https://publicmetadb.com/api-docs" target="_blank" rel="noopener">PublicMetaDB API setup ↗</a></div></div></details>
  <details class="service-card tracker-service" id="svc-simkl"><summary>Simkl</summary><div class="svc">
    <p class="note">Create an app at simkl.com/settings/developer and paste its client id.</p>
    <div class="f"><label class="t" for="simkl-id">Client id</label><input type="text" id="simkl-id" data-ui="simkl.clientId" autocomplete="off" spellcheck="false"></div>
    <div class="row"><button type="button" id="simkl-connect">Connect</button><button type="button" id="simkl-disconnect">Disconnect</button></div>
    <div id="simkl-code" hidden><div class="code" id="simkl-usercode"></div><p class="note">Enter the code at <a id="simkl-verify" target="_blank" rel="noopener"></a>. This page keeps checking until Simkl confirms.</p></div>
    <p class="status" id="simkl-status"></p>
  </div></details>

  <details class="service-card tracker-service" id="svc-mal"><summary>MyAnimeList</summary><div class="svc">
    <p class="note">Create an API client at myanimelist.net/apiconfig (type: other). Open the authorisation page, approve, then paste the <span class="mono">code</span> from the address you land on.</p>
    <div class="two">
      <div class="f"><label class="t" for="mal-id">Client id</label><input type="text" id="mal-id" data-ui="mal.clientId" autocomplete="off" spellcheck="false"></div>
      <div class="f"><label class="t" for="mal-redirect">Redirect URI (only if your app has one)</label><input type="text" id="mal-redirect" data-ui="mal.redirectUri" autocomplete="off" spellcheck="false"></div>
    </div>
    <div class="row"><button type="button" id="mal-open">Open authorisation page</button></div>
    <p class="hint mono" id="mal-url"></p>
    <div class="row"><div class="f"><label class="t" for="mal-code">Authorisation code</label><input type="text" id="mal-code" autocomplete="off" spellcheck="false"></div><div class="f" style="flex:0"><button type="button" id="mal-exchange">Exchange</button></div></div>
    <div class="row"><button type="button" id="mal-disconnect">Disconnect</button></div>
    <p class="status" id="mal-status"></p>
  </div></details>

  <details class="service-card tracker-service" id="svc-anilist"><summary>AniList</summary><div class="svc">
    <p class="note">Create a client at anilist.co/settings/developer with redirect <span class="mono">https://anilist.co/api/v2/oauth/pin</span>. Open the link, approve, and paste the token AniList shows you.</p>
    <div class="f"><label class="t" for="anilist-id">Client id</label><input type="text" id="anilist-id" data-ui="anilist.clientId" autocomplete="off" spellcheck="false"></div>
    <p class="hint"><a id="anilist-link" target="_blank" rel="noopener">Open AniList authorisation page</a></p>
    <div class="row"><div class="f"><label class="t" for="anilist-token">Access token</label><input type="password" id="anilist-token" autocomplete="off"></div><div class="f" style="flex:0"><button type="button" id="anilist-save">Save</button></div></div>
    <div class="row"><button type="button" id="anilist-disconnect">Disconnect</button></div>
    <p class="status" id="anilist-status"></p>
  </div></details>
</section>

<section id="s-search">
  <h2><small>6</small>Search</h2><p class="note">Extra search providers start off. Only the sources you enable here are queried by Rill’s built-in search.</p>
  <label class="t">Providers</label>
  <div class="checks">
    <label data-needs="tmdb"><input type="checkbox" data-arr="search.providers" value="tmdb"> TMDB</label>
    <label data-needs="tvdb"><input type="checkbox" data-arr="search.providers" value="tvdb"> TVDB</label>
    <label><input type="checkbox" data-arr="search.providers" value="cinemeta"> Cinemeta</label>
    <label><input type="checkbox" data-arr="search.providers" value="mal"> MyAnimeList</label>
    <label><input type="checkbox" data-arr="search.providers" value="anilist"> AniList</label>
    <label><input type="checkbox" data-arr="search.providers" value="kitsu"> Kitsu</label>
  </div>
  <div class="checks"><label><input type="checkbox" data-k="search.includeAdult"> Include adult titles</label></div>
</section>

<section id="s-age">
  <h2><small>7</small>Age cap</h2>
  <div class="f"><label class="t" for="agecap">Highest allowed rating</label><div class="sel"><select id="agecap" data-k="ageCap">${options(AGE_CAPS)}</select></div></div>
  <p class="note">Hide titles above this rating. PG-13 also allows TV-14. Unrated titles remain visible.</p>
</section>

<section id="s-jellyfin">
  <h2><small>8</small>Jellyfin</h2>
  <div class="two">
    <div class="f"><label class="t" for="jf-user">Username</label><input type="text" id="jf-user" data-k="jellyfin.username" autocomplete="off" spellcheck="false"></div>
    <div class="f"><label class="t" for="jf-pass">Password</label><input type="password" id="jf-pass" data-k="jellyfin.password" autocomplete="off"></div>
    <div class="f"><label class="t" for="jf-max">Max sources per title</label><input type="number" id="jf-max" data-k="jellyfin.maxSources" min="1" max="200"></div>
    <div class="f"><label class="t" for="jf-torrent">Torrent streaming server</label><input type="url" id="jf-torrent" data-k="jellyfin.torrentServer" placeholder="Optional, e.g. http://localhost:11470" autocomplete="off" spellcheck="false"></div>
  </div>
  <details class="profile-settings"><summary>Profiles</summary><p class="note">Profiles use the same password. Share your watch history or keep it separate.</p><div id="profiles"></div><button type="button" id="profile-add">Add profile</button></details>
  <label class="t">Home screen rows</label>
  <div class="list" data-order="jellyfin.home" data-options="resume,nextup,latest,upcoming"></div>
</section>

<section id="s-collections">
  <h2>Collections</h2>
  <p class="note section-intro" id="collections-intro">Build visual box-set libraries for Jellyfin.</p>
  <div class="collection-toolbar" id="collections-toolbar">
    <button type="button" class="primary" id="collection-add">New collection</button>
    <details class="collection-tools"><summary>Import / export</summary><div class="b"><button type="button" id="collection-import-toggle">Import</button><button type="button" id="collection-export-all">Export all</button></div></details>
  </div>
  <div id="collection-import" hidden><label class="t" for="collection-import-text">Import collections</label><textarea id="collection-import-text" rows="4" placeholder="Paste a collection export, or a link to one" spellcheck="false"></textarea><div class="b"><button type="button" id="collection-import-btn">Import</button><span class="hint" id="collection-import-status" role="status"></span></div></div>
  <textarea id="collection-export-text" aria-label="Collection export" rows="4" hidden readonly spellcheck="false"></textarea>
  <div id="collections-empty" class="collection-empty"><strong>No collections yet</strong><p>Create a library, add box sets, and give them your own artwork.</p></div>
  <div id="jf-collections"></div>
</section>

<section id="s-install">
  <h2><small>9</small>Connect Jellyfin</h2><p class="note">Enter this server address in your Jellyfin app, then sign in with your server account.</p>
  <div class="out"><label class="t">Jellyfin server</label><div class="u" id="url-jellyfin"></div><div class="b"><button type="button" data-copy="url-jellyfin">Copy</button><span id="jf-hint"></span></div></div>
  <p class="status" id="enc-status"></p>
  <h3>Load an existing config</h3>
  <div class="row"><div class="f"><input type="text" id="load-input" placeholder="Paste an install URL or a token" autocomplete="off" spellcheck="false"></div><div class="f" style="flex:0"><button type="button" id="load-btn">Load</button></div></div>
  <p class="status" id="load-status"></p>
  <p class="hint"><button class="q" type="button" id="reset-btn">Start over with defaults</button></p>
</section>

</div></div>
<div hidden><span id="summary-catalogs"></span><span id="summary-addons"></span><span id="summary-tracker"></span></div>
</main>`;
}

const JS = String.raw`
(function () {
  'use strict';
  var DEFAULTS = __DEFAULTS__;
  var ORIGIN = location.origin;
  var LABELS = {
    tmdb: 'TMDB', fanart: 'Fanart.tv', tvdb: 'TVDB', rpdb: 'RPDB', metahub: 'Metahub',
    resume: 'Continue watching', nextup: 'Next up', latest: 'Recently added', upcoming: 'Upcoming'
  };

  document.querySelectorAll('#panels > section').forEach(function(section) {
    if (section.id === 's-age') return;
    var heading = section.querySelector('h2');
    var content = document.createElement('div');
    content.className = 'section-content';
    Array.from(section.childNodes).forEach(function(node) {
      if (node !== heading) content.appendChild(node);
    });
    section.appendChild(content);
  });
  document.querySelector('#s-general .section-content').appendChild(document.getElementById('s-age'));
  var groups = { general:['general','updates'], meta:['meta','search'], catalogs:['catalogs'], collections:['collections'], addons:['addons'], tracking:['tracking'], jellyfin:['jellyfin'], install:['install'] };
  Object.keys(groups).forEach(function(key) {
    var panel = document.createElement('div');
    panel.id = 'panel-' + key;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', 'tab-' + key);
    panel.tabIndex = 0;
    groups[key].forEach(function(id) { panel.appendChild(document.getElementById('s-' + id)); });
    document.getElementById('panels').appendChild(panel);
  });
  document.querySelectorAll('#s-tracking > .section-content > .svc').forEach(function(service) {
    var details = document.createElement('details');
    details.className = 'service-card';
    var summary = document.createElement('summary');
    var title = service.querySelector('h3');
    summary.textContent = title.textContent;
    title.remove();
    service.parentNode.insertBefore(details, service);
    details.appendChild(summary);
    details.appendChild(service);
  });
  function applyMode() {
    var advanced = !!cfg.advanced;
    all('[data-simple-catalog-note]').forEach(function(note) { note.hidden = advanced; });
    document.getElementById('mode-' + (advanced ? 'advanced' : 'simple')).checked = true;
    all('[data-advanced]').forEach(function(tab) { tab.hidden = !advanced; });
    var current = all('[data-tab]').filter(function(t) { return t.getAttribute('aria-selected') === 'true'; })[0];
    if (current && current.hidden) { location.hash = 'general'; selectTab('general', false); }
    if (typeof renderDrawerNav === 'function' && document.getElementById('drawer-nav').children.length) renderDrawerNav();
  }
  function selectTab(key, focus) {
    if (!groups[key]) key = 'general';
    var target = document.getElementById('tab-' + key);
    if (target && target.hidden) key = 'general';
    all('[data-tab]').forEach(function(tab) {
      var active = tab.dataset.tab === key;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById('panel-' + tab.dataset.tab).hidden = !active;
      if (active && focus) { tab.focus(); tab.scrollIntoView({block:'nearest',inline:'nearest'}); }
    });
  }
  all('[data-tab]').forEach(function(tab) {
    tab.addEventListener('click', function() { location.hash = tab.dataset.tab; selectTab(tab.dataset.tab, false); });
    tab.addEventListener('keydown', function(e) {
      var tabs = all('[data-tab]').filter(function(t) { return !t.hidden; }), index = tabs.indexOf(tab);
      var next = e.key === 'ArrowRight' ? (index+1)%tabs.length : e.key === 'ArrowLeft' ? (index+tabs.length-1)%tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length-1 : -1;
      if (next < 0) return;
      e.preventDefault(); location.hash = tabs[next].dataset.tab; selectTab(tabs[next].dataset.tab, true);
    });
  });
  window.addEventListener('hashchange', function() { selectTab(location.hash.slice(1), false); });
  selectTab(location.hash.slice(1), false);

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function merge(base, over) {
    if (!isObj(over)) return base;
    var out = clone(base);
    Object.keys(over).forEach(function (k) {
      if (isObj(base[k]) && isObj(over[k])) out[k] = merge(base[k], over[k]);
      else if (over[k] !== undefined) out[k] = clone(over[k]);
    });
    return out;
  }
  var memory = {};
  function ssGet(key) { return memory[key] || null; }
  function ssSet(key, val) { memory[key] = val; }

  var cfg = clone(DEFAULTS);
  if (['Luma', 'Titan', 'Frame', 'Noma', 'Vanta'].indexOf(cfg.name) !== -1) cfg.name = 'Rill';
  var ui = merge({ trakt: { clientId: '', clientSecret: '' }, simkl: { clientId: '' }, mal: { clientId: '', redirectUri: '' }, anilist: { clientId: '' } }, null);
  var catDefs = [];
  var token = '';

  function get(path, obj) {
    var cur = obj || cfg;
    var parts = path.split('.');
    for (var i = 0; i < parts.length; i++) { if (cur == null) return undefined; cur = cur[parts[i]]; }
    return cur;
  }
  function set(path, value, obj) {
    var cur = obj || cfg;
    var parts = path.split('.');
    for (var i = 0; i < parts.length - 1; i++) { if (!isObj(cur[parts[i]])) cur[parts[i]] = {}; cur = cur[parts[i]]; }
    cur[parts[parts.length - 1]] = value;
  }

  function $(id) { return document.getElementById(id); }
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] === false || attrs[k] == null) {}
      else n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function move(arr, i, d) { var j = i + d; if (j < 0 || j >= arr.length) return arr; var t = arr[i]; arr[i] = arr[j]; arr[j] = t; return arr; }
  function when(ms) { return ms ? new Date(ms).toLocaleString() : ''; }

  function api(path, body) {
    return fetch(ORIGIN + path, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}), cache: 'no-store'
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok && !data.error) data.error = 'Request failed (' + r.status + ').';
        return data;
      });
    }).catch(function () { return { error: 'Network error.' }; });
  }

  var encTimer = null, catTimer = null, lastCatKey = '';
  function catalogKey() {
    return JSON.stringify([cfg.advanced, cfg.keys, cfg.addons, cfg.lists, cfg.customCatalogs, cfg.movieLens, cfg.recommendations, cfg.providers, cfg.language, cfg.ageCap, trackerFingerprint()]);
  }
  function trackerFingerprint() {
    var t = cfg.trackers;
    return [t.primary, t.scrobbleTo.join(','), !!(t.trakt && t.trakt.accessToken), !!(t.simkl && t.simkl.accessToken), !!(t.mal && t.mal.accessToken), !!(t.anilist && t.anilist.accessToken)];
  }
  function updateSummary() {
    $('summary-catalogs').textContent = cfg.catalogs.filter(function(c) { return c.enabled; }).length;
    $('summary-addons').textContent = cfg.addons.stream.length;
    $('summary-tracker').textContent = {off:'Server only',trakt:'Trakt',simkl:'Simkl',mdblist:'MDBList',publicmetadb:'PublicMetaDB',mal:'MyAnimeList',anilist:'AniList'}[cfg.trackers.primary] || 'Off';
  }
  function changed() {
    cfg.revision=Math.max(Date.now(),(cfg.revision || 0)+1);
    updateSummary();
    refreshNeeds();
    $('draft-status').textContent = account.signedIn ? 'Saving…' : '';
    clearTimeout(encTimer);
    encTimer = setTimeout(encode, 400);
    if (catalogKey() !== lastCatKey) { clearTimeout(catTimer); catTimer = setTimeout(loadCatalogs, 900); }
    if (account.signedIn && account.loaded) { clearTimeout(saveTimer); saveTimer = setTimeout(saveRemote, 800); }
  }

  var account = { durable: false, exists: false, signedIn: false, loaded: false, username: '' }, saveTimer = null, wantedTab = location.hash.slice(1);
  var updateState = null, updateBusy = false, updateTimer = null, updatePoll = null, updateLoaded = false, updateLoading = false;
  function showUpdateSettings() {
    location.hash = 'general'; selectTab('general', false);
    $('s-updates').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function renderUpdates() {
    var signedIn = account.durable && account.signedIn;
    $('update-start').disabled = !signedIn || updateBusy || !updateState || !updateState.configured || updateState.retryAfter > 0;
    $('update-start').textContent = updateBusy ? 'Please wait…' : 'Update Rill';
    $('update-save').disabled = !signedIn || updateBusy || !updateLoaded;
    $('update-hook').disabled = !signedIn || updateBusy || !updateLoaded;
    $('update-daily').disabled = !signedIn || updateBusy || !updateLoaded;
    $('update-disconnect').disabled = !signedIn || updateBusy;
    $('update-disconnect').hidden = !updateState || !updateState.configured;
    $('update-settings-label').textContent = updateState && updateState.configured ? 'Update settings' : 'Connect updates';
    $('update-save').textContent = updateState && updateState.configured ? 'Save update settings' : 'Connect updates';
    $('update-refresh').disabled = !signedIn || updateBusy || updateLoading;
    ['update-account-id','update-worker','update-token','update-monitor-save'].forEach(function(id) { $(id).disabled = !signedIn || updateBusy || !updateLoaded; });
    var monitor = updateState && updateState.monitor;
    $('update-monitor-remove').hidden = !monitor || !monitor.configured;
    $('update-monitor-remove').disabled = !signedIn || updateBusy;
    $('update-monitor-save').textContent = monitor && monitor.configured ? 'Save build connection' : 'Connect build results';
    var expanded = Array.from($('update-history').querySelectorAll('details[open]')).map(function(d) { return d.dataset.request; });
    clear($('update-history'));
    if (!signedIn || !updateState) {
      $('update-overview').textContent = '';
      $('update-history-note').textContent = 'Sign in to see your update history.';
      return;
    }
    var next = new Date(); next.setUTCHours(4,17,0,0); if (next.getTime() <= Date.now()) next.setUTCDate(next.getUTCDate()+1);
    $('update-overview').textContent = (updateState.configured ? 'Updates connected. ' : 'Updates disconnected. ') + (updateState.daily ? 'Next automatic request: ' + when(next.getTime()) + ' (04:17 UTC).' : 'Automatic updates off.') + (updateState.retryAfter > 0 ? ' You can request another update after ' + when(Date.now()+updateState.retryAfter*1000) + '.' : '');
    var history = updateState.history || [];
    $('update-history-note').textContent = !history.length ? 'No requests recorded yet. History starts with your next update.' : 'Your last ' + history.length + ' requests (up to 30).';
    $('update-history-note').textContent += monitor && monitor.configured ? (monitor.error ? ' ' + monitor.error : monitor.checkedAt ? ' Build results checked ' + when(monitor.checkedAt) + '.' : '') : ' A request accepted by Cloudflare is not yet a confirmed successful build. Connect build results below, or check Cloudflare.';
    var labels = {requesting:'Sending request',accepted:'Request accepted',request_failed:'Request failed',queued:'Queued',initializing:'Preparing build',running:'Building / deploying',succeeded:'Build succeeded',failed:'Build failed',cancelled:'Canceled',skipped:'Skipped',unknown:'Result unconfirmed'};
    history.forEach(function(run) {
      var item = el('li'), head = el('div',{class:'update-history-head'});
      head.appendChild(el('strong',{text:run.source === 'daily' ? 'Automatic update' : 'Manual update'}));
      var badge = el('span',{class:'update-result',text:labels[run.status] || 'Result unconfirmed'});
      badge.setAttribute('data-status',run.status); head.appendChild(badge); item.appendChild(head);
      item.appendChild(el('p',{class:'hint',text:'Requested ' + when(run.requested_at)}));
      if (run.message) item.appendChild(el('p',{class:'hint',text:run.message}));
      if (run.status === 'unknown' && !run.message) item.appendChild(el('p',{class:'hint',text:'No final result was confirmed. Check Cloudflare before requesting another update.'}));
      if (run.status === 'succeeded') item.appendChild(el('p',{class:'hint',text:'Cloudflare completed the build and deploy command. Reload Rill to load the latest page.'}));
      if (run.build_id || run.finished_at || run.checked_at) {
        var details = el('details'); details.dataset.request = run.id; details.open = expanded.indexOf(run.id) !== -1;
        details.appendChild(el('summary',{text:'Build details'}));
        if (run.build_id) details.appendChild(el('p',{class:'hint',text:'Build ID: ' + run.build_id}));
        if (run.branch) details.appendChild(el('p',{class:'hint',text:'Branch: ' + run.branch}));
        if (run.finished_at) details.appendChild(el('p',{class:'hint',text:'Finished ' + when(run.finished_at) + ' · ' + Math.max(0,Math.round((run.finished_at-run.requested_at)/1000)) + ' seconds after request'}));
        if (run.checked_at) details.appendChild(el('p',{class:'hint',text:'Confirmed by Cloudflare ' + when(run.checked_at)}));
        if (run.buildUrl) details.appendChild(el('a',{text:'View build and logs ↗',href:run.buildUrl,target:'_blank',rel:'noopener noreferrer'}));
        item.appendChild(details);
      }
      $('update-history').appendChild(item);
    });
  }
  function adoptUpdateStatus(result, resetSettings) {
    if (!updateLoaded || resetSettings) {
      $('update-hook').value = ''; $('update-token').value = '';
      $('update-daily').checked = result.daily;
      $('update-account-id').value = result.monitor ? result.monitor.accountId : '';
      $('update-worker').value = result.monitor ? result.monitor.worker : '';
    }
    updateState = result; updateLoaded = true;
    clearTimeout(updateTimer);
    if (result.retryAfter > 0) updateTimer = setTimeout(function () {
      if (updateState) updateState.retryAfter = 0;
      renderUpdates();
    }, result.retryAfter * 1000);
    clearTimeout(updatePoll);
    if ((result.history || []).some(function(run) { return Date.now()-run.requested_at < 3600000 && (run.status === 'requesting' || (result.monitor && result.monitor.configured && ['accepted','queued','initializing','running','unknown'].indexOf(run.status) !== -1)); })) {
      updatePoll = setTimeout(function() { if (account.signedIn && !document.hidden) loadUpdates(true); }, 15000);
    }
    renderUpdates();
  }
  function loadUpdates(silent) {
    if (!account.signedIn || updateLoading) return;
    updateLoading = true; renderUpdates();
    api('/api/updates/status').then(function (r) {
      if (!account.signedIn) return;
      if (r.error) { if (!silent) $('update-status').textContent = r.error; return; }
      adoptUpdateStatus(r);
      if (!silent) $('update-status').textContent = r.retryAfter > 0 ? 'An update was recently requested. Its result is shown below.' : r.configured ? 'Ready when you are.' : 'Connect Cloudflare below to enable updates.';
    }).finally(function () { updateLoading = false; renderUpdates(); });
  }
  function updateAction(action, body) {
    updateBusy = true; renderUpdates();
    $('update-status').textContent = action === 'start' ? 'Requesting an update…' : 'Saving…';
    api('/api/updates/' + action, body).then(function (r) {
      if (!account.signedIn) return;
      if (r.error) { $('update-status').textContent = r.error; if (action === 'start') loadUpdates(true); return; }
      adoptUpdateStatus(r, action !== 'start');
      $('update-status').textContent = action === 'start' ? (r.alreadyRequested ? 'An update request is already in progress or was recently accepted. ' : 'Update requested. ') + 'See its result below. Reload Rill after the build succeeds.' : action === 'disconnect' ? 'Updates disconnected.' : action === 'monitor' ? (r.monitor.configured ? 'Build results connected.' : 'Build results disconnected. Request history is kept.') : 'Connected. You can now update Rill with one click.';
      if (action === 'configure') $('update-settings').open = false;
      if (action === 'monitor') $('update-monitor-settings').open = false;
    }).finally(function () { updateBusy = false; renderUpdates(); });
  }
  $('update-start').addEventListener('click', function () { updateAction('start'); });
  $('update-refresh').addEventListener('click', function () { loadUpdates(); });
  $('update-monitor-save').addEventListener('click', function () { updateAction('monitor', {accountId:$('update-account-id').value,worker:$('update-worker').value,token:$('update-token').value}); });
  $('update-monitor-remove').addEventListener('click', function () { updateAction('monitor', {disconnect:true}); });
  document.addEventListener('visibilitychange', function() { if (!document.hidden && account.signedIn && updateLoaded) loadUpdates(true); });
  $('update-save').addEventListener('click', function () { updateAction('configure', { hook: $('update-hook').value, daily: $('update-daily').checked }); });
  $('update-disconnect').addEventListener('click', function () { updateAction('disconnect'); });
  $('update-settings').addEventListener('toggle', function () { if (this.open && !updateLoaded) loadUpdates(); });
  function adoptServerConfig(config) {
    if (!config) return;
    var key = cfg.installationKey;
    cfg = merge(DEFAULTS, config);
    if (!cfg.installationKey) cfg.installationKey = key;
    lastCatKey = ''; account.loaded = true;
    renderAll(); encode(); loadCatalogs();
    if (wantedTab) { location.hash = wantedTab; selectTab(wantedTab, false); wantedTab = ''; }
    $('draft-status').textContent = 'Synced with your server';
  }
  var activePop = null;
  document.addEventListener('click', function (e) { if (activePop && !activePop.pop.hidden && !activePop.host.contains(e.target)) activePop.close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && activePop && !activePop.pop.hidden) { activePop.close(); activePop.chip.focus(); } });
  function initial(name) { return (name || '?').trim().charAt(0).toUpperCase() || '?'; }
  function statusText() { return $('draft-status').textContent || ''; }
  function renderAccount() {
    refreshTrackingSummary();
    var host = $('account'), side = $('drawer-account'); clear(host); clear(side);
    if (account.durable && account.signedIn) {
      var chip = el('button', { type: 'button', class: 'chip', 'aria-haspopup': 'menu', 'aria-expanded': 'false' }, [
        el('span', { class: 'avatar', 'aria-hidden': 'true', text: initial(account.username) }), el('span', { text: account.username }), el('span', { class: 'chev', 'aria-hidden': 'true', text: '▾' })]);
      var pop = el('div', { class: 'popover', role: 'menu', hidden: true });
      function openPop(open) { pop.hidden = !open; chip.setAttribute('aria-expanded', String(open)); if (open) { clear(pop);
        pop.appendChild(el('div', { class: 'pop-user' }, [el('span', { class: 'avatar big', 'aria-hidden': 'true', text: initial(account.username) }), el('div', {}, [el('strong', { text: account.username }), el('small', { text: statusText() })])]));
        pop.appendChild(el('button', { type: 'button', role: 'menuitem', text: 'Update Rill', onclick: function () { openPop(false); showUpdateSettings(); } }));
        pop.appendChild(el('button', { type: 'button', role: 'menuitem', text: 'Log out', onclick: function () { openPop(false); logout(); } })); } }
      chip.addEventListener('click', function (e) { e.stopPropagation(); openPop(pop.hidden); });
      activePop = { pop: pop, chip: chip, host: host, close: function () { openPop(false); } };
      host.appendChild(chip); host.appendChild(pop);
      side.appendChild(el('span', { class: 'avatar big', 'aria-hidden': 'true', text: initial(account.username) }));
      side.appendChild(el('div', { class: 'meta' }, [el('strong', { text: account.username }), el('small', { text: statusText() })]));
      side.appendChild(el('button', { type: 'button', class: 'q', text: 'Log out', onclick: function () { closeDrawer(); logout(); } }));
    }
    $('login-gate').hidden = !(account.exists && !account.signedIn);
    if (!$('login-gate').hidden) $('login-user').focus();
    var firstRun = account.durable && !account.exists;
    $('setup-gate').hidden = !firstRun;
    if (firstRun) { $('setup-user').value = $('setup-user').value || (cfg.jellyfin.username !== 'rill' ? cfg.jellyfin.username : ''); $('setup-user').focus(); }
    if (!account.signedIn) {
      updateState = null; updateLoaded = false; clearTimeout(updateTimer); clearTimeout(updatePoll);
      $('update-hook').value = ''; $('update-token').value = ''; $('update-account-id').value = ''; $('update-worker').value = ''; $('update-daily').checked = false;
      $('update-status').textContent = 'Sign in to manage updates.';
    } else if (!updateLoaded) loadUpdates();
    renderUpdates();
  }
  $('setup-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var status = $('setup-status'), user = $('setup-user').value.trim(), pass = $('setup-pass').value;
    if (!/^[a-z0-9._-]{1,32}$/i.test(user)) { status.textContent = 'Username: letters, numbers, dot, dash or underscore.'; return; }
    if (pass.length < 8) { status.textContent = 'Use at least 8 characters.'; return; }
    if (pass !== $('setup-pass2').value) { status.textContent = 'Passwords do not match.'; return; }
    status.textContent = 'Creating…';
    cfg.jellyfin.username = user; cfg.jellyfin.password = pass;
    saveRemote().then(function (r) {
      if (r.error) { status.textContent = r.error; return; }
      status.textContent = ''; $('setup-pass').value = ''; $('setup-pass2').value = '';
      account.exists = true; account.signedIn = true; account.loaded = true; account.username = r.username || user;
      fillInputs(); renderInstall(); renderAccount(); $('draft-status').textContent = 'Saved to your server';
    });
  });

  var drawer = $('drawer'), backdrop = $('drawer-backdrop'), drawerTimer = null;
  function openDrawer() {
    clearTimeout(drawerTimer); renderDrawerNav(); renderAccount();
    drawer.hidden = false; backdrop.hidden = false; $('menu-btn').setAttribute('aria-expanded', 'true');
    requestAnimationFrame(function () { drawer.classList.add('open'); backdrop.classList.add('open'); });
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    drawer.classList.remove('open'); backdrop.classList.remove('open'); $('menu-btn').setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    clearTimeout(drawerTimer); drawerTimer = setTimeout(function () { drawer.hidden = true; backdrop.hidden = true; }, 300);
  }
  function renderDrawerNav() {
    var nav = $('drawer-nav'); clear(nav);
    all('[data-tab]').forEach(function (tab) {
      var item = el('button', { type: 'button', class: tab.getAttribute('aria-selected') === 'true' ? 'active' : '', text: tab.textContent, hidden: tab.hidden || undefined,
        onclick: function () { location.hash = tab.dataset.tab; selectTab(tab.dataset.tab, false); closeDrawer(); window.scrollTo({ top: 0 }); } });
      nav.appendChild(item);
    });
    all('.seg [data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String((b.dataset.mode === 'advanced') === !!cfg.advanced)); });
  }
  $('menu-btn').addEventListener('click', function () { drawer.hidden ? openDrawer() : closeDrawer(); });
  $('drawer-close').addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) closeDrawer(); });
  all('.seg [data-mode]').forEach(function (b) { b.addEventListener('click', function () { cfg.advanced = b.dataset.mode === 'advanced'; changed(); applyMode(); renderDrawerNav(); }); });
  function saveRemote() {
    return api('/api/account/save', { config: cfg }).then(function (r) {
      if (r.error) { $('draft-status').textContent = r.error; return r; }
      $('draft-status').textContent = 'Saved to your server';
      if (r.config && r.config.installationKey) cfg.installationKey = r.config.installationKey;
      if (r.token) { token = r.token; renderInstall(); }
      return r;
    });
  }
  function logout() {
    clearTimeout(saveTimer);
    api('/api/account/logout').then(function () { account.signedIn = false; account.loaded = false; account.username = ''; cfg = clone(DEFAULTS); token = ''; lastCatKey = ''; renderAll(); renderAccount(); });
  }
  $('login-form').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('login-submit').click(); } });
  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var status = $('login-status'); status.textContent = 'Signing in…';
    api('/api/account/login', { username: $('login-user').value, password: $('login-pass').value }).then(function (r) {
      if (r.error) { status.textContent = r.error; return; }
      status.textContent = ''; $('login-pass').value = '';
      account.signedIn = true; account.username = r.username || '';
      adoptServerConfig(r.config);
      renderAccount();
    });
  });
  function uiChanged() { renderAuthLinks(); }

  function encode() {
    $('enc-status').textContent = '';
    return api('/api/config/encode', cfg).then(function (r) {
      if (r.error || !r.token) { $('enc-status').textContent = r.error || 'Could not build the install URL.'; return; }
      token = r.token;
      renderInstall();
    });
  }

  function renderInstall() {
    $('url-jellyfin').textContent = ORIGIN;
    $('jf-hint').textContent = account.durable && account.exists ? 'Sign in as “' + cfg.jellyfin.username + '” with your password.' : 'Save your server account before connecting.';
  }

  function loadCatalogs() {
    lastCatKey = catalogKey();
    $('cat-status').textContent = 'Loading catalogs…';
    api('/api/catalogs', cfg).then(function (r) {
      if (r.error && !(r.catalogs && r.catalogs.length)) { $('cat-status').textContent = r.error; return; }
      catDefs = Array.isArray(r.catalogs) ? r.catalogs : [];
      renderProfiles();
      if(!$('custom-catalogs').contains(document.activeElement)) renderCustomCatalogs();
      if(!$('jf-collections').contains(document.activeElement)) renderCollections();
      $('cat-status').textContent = catDefs.length ? '' : 'No catalogs available with the current settings.';
      reconcileCatalogs();
      renderCatalogs();
      changed();
    });
  }
  function catKey(c) { return c.type + ':' + c.id; }
  function reconcileCatalogs() {
    var known = {};
    catDefs.forEach(function (d) { known[catKey(d)] = d; });
    var kept = cfg.catalogs.slice();
    var have = {};
    kept.forEach(function (c) { have[catKey(c)] = true; if(known[catKey(c)] && !c.name) c.name = known[catKey(c)].name; });
    catDefs.forEach(function (d) { if (!have[catKey(d)]) kept.push({ id: d.id, type: d.type, enabled: d.defaultEnabled === true, name: d.name }); });
    cfg.catalogs = kept;
  }
  function renderCatalogs() {
    var root = $('catalogs');
    clear(root);
    if (!catDefs.length) { filterCatalogs(); return; }
    var defs = {};
    catDefs.forEach(function (d) { defs[catKey(d)] = d; });
    var groups = [], byName = {}, groupNames = {};
    cfg.catalogs.forEach(function (c, idx) {
      var d = defs[catKey(c)]; if (!d) return;
      var g = d.source ? d.source.id : d.group || 'Catalogs';
      if (!byName[g]) { byName[g] = []; groupNames[g] = d.source ? d.source.name : g; groups.push(g); }
      byName[g].push(idx);
    });
    groups.sort(function(a, b) {
      return Number(cfg.catalogs[byName[b][0]].id.startsWith('addon.')) - Number(cfg.catalogs[byName[a][0]].id.startsWith('addon.'));
    });
    groups.forEach(function (g) {
      var idxs = byName[g];
      var sourceToggle = el('input', { type: 'checkbox', 'aria-label': 'Enable all catalogs from ' + groupNames[g] });
      var sourceCount = el('span');
      function updateSourceToggle() {
        var enabled = idxs.filter(function(idx) { return cfg.catalogs[idx].enabled; }).length;
        sourceToggle.checked = enabled === idxs.length;
        sourceToggle.indeterminate = enabled > 0 && enabled < idxs.length;
        sourceCount.textContent = 'Enable all · ' + enabled + '/' + idxs.length;
      }
      var box = el('div', { class: 'group' }, [el('div', { class: 'catalog-source-heading' }, [
        el('div', { class: 'gname', text: groupNames[g] }), el('label', { class: 'check' }, [sourceToggle, sourceCount])
      ])]);
      var list = el('div', { class: 'list' });
      var rows = [];
      sourceToggle.addEventListener('change', function () {
        rows.forEach(function(entry) {
          entry.catalog.enabled = sourceToggle.checked;
          entry.checkbox.checked = sourceToggle.checked;
          entry.row.className = 'item' + (sourceToggle.checked ? '' : ' off');
        });
        updateSourceToggle();
        changed();
      });
      idxs.forEach(function (idx, pos) {
        var c = cfg.catalogs[idx], d = defs[catKey(c)];
        var cb = el('input', { type: 'checkbox', 'aria-label': 'Enable ' + d.name });
        cb.checked = !!c.enabled;
        cb.addEventListener('change', function () { c.enabled = cb.checked; row.className = 'item' + (c.enabled ? '' : ' off'); updateSourceToggle(); changed(); });
        var sub = d.type + (d.needs ? ' · needs ' + (Array.isArray(d.needs) ? d.needs.join(', ') : d.needs) : '');
        var name = el('div', { class: 'n' }, [document.createTextNode(d.name), el('small', { text: sub })]);
        var up = el('button', { type: 'button', text: '↑', title: 'Move ' + d.name + ' up', 'aria-label': 'Move ' + d.name + ' up', disabled: pos === 0, onclick: function () { swapCatalog(idxs[pos], idxs[pos - 1]); } });
        var dn = el('button', { type: 'button', text: '↓', title: 'Move ' + d.name + ' down', 'aria-label': 'Move ' + d.name + ' down', disabled: pos === idxs.length - 1, onclick: function () { swapCatalog(idxs[pos], idxs[pos + 1]); } });
        var row = el('div', { class: 'item' + (c.enabled ? '' : ' off') }, [cb, name, el('div', { class: 'ud' }, [up, dn])]);
        rows.push({ catalog: c, checkbox: cb, row: row });
        list.appendChild(row);
      });
      box.appendChild(list);
      updateSourceToggle();
      root.appendChild(box);
    });
    filterCatalogs();
  }
  function filterCatalogs() {
    var query = $('catalog-filter').value.trim().toLowerCase();
    var total = 0, visible = 0;
    all('#catalogs .group').forEach(function(group) {
      var matches = 0;
      all('.item', group).forEach(function(row) {
        var text = group.querySelector('.gname').textContent + ' ' + row.querySelector('.n').textContent;
        row.hidden = !text.toLowerCase().includes(query);
        total++; if (!row.hidden) { visible++; matches++; }
      });
      group.hidden = matches === 0;
    });
    $('catalog-count').textContent = query ? visible + ' / ' + total : total + ' catalogs';
    $('catalog-empty').hidden = !query || visible > 0 || total === 0;
  }
  $('catalog-filter').addEventListener('input', filterCatalogs);
  function renderCustomCatalogs() {
    var root=$('custom-catalogs');clear(root);
    (cfg.customCatalogs || []).forEach(function(c,index) {
      var box=el('div',{class:'group'});
      function field(label,key,options) {
        var input=options?el('select'):el('input',{type:'text'});
        if(options) options.forEach(function(o){input.appendChild(el('option',{value:o[0],text:o[1]}));});
        input.value=c[key] || '';
        input.setAttribute('aria-label',label);
        input.addEventListener(options?'change':'input',function(){c[key]=input.value;if(key==='provider'){c.params={};c.sources=[];}if(key==='provider'||key==='type')renderCustomCatalogs();changed();});
        box.appendChild(el('label',{class:'f'},[el('span',{class:'t',text:label}),input]));
      }
      field('Name','name');
      field('Source','provider',[['tmdb','TMDB'],['tvdb','TVDB'],['mal','MyAnimeList'],['anilist','AniList'],['movielens','MovieLens'],['simkl','Simkl'],['merged','Combine catalogs']]);
      field('Media','type',[['movie','Movies'],['series','Series'],['anime','Anime']]);
      c.params=c.params || {};
      if(c.provider==='merged') {
        var select=el('select',{'aria-label':'Catalog to add'});
        select.appendChild(el('option',{value:'',text:'Choose a catalog'}));
        catDefs.filter(function(d){return d.id.indexOf('merged.')!==0&&!(d.extra || []).some(function(e){return e.name==='search'&&e.isRequired;});}).forEach(function(d){select.appendChild(el('option',{value:d.type+'|'+d.id,text:d.name+' ('+d.type+')'}));});
        select.addEventListener('change',function(){if(!select.value)return;var parts=select.value.split('|');c.sources=c.sources || [];if(!c.sources.some(function(s){return s.id===parts[1]&&s.type===parts[0];}))c.sources.push({type:parts[0],id:parts[1]});renderCustomCatalogs();changed();});
        box.appendChild(select);
        (c.sources || []).forEach(function(s,i){var def=catDefs.find(function(d){return d.id===s.id&&d.type===s.type;});var genre=el('input',{type:'text','aria-label':'Source genre or filter',value:s.genre||'',placeholder:'Optional genre or filter value'});genre.addEventListener('input',function(){s.genre=genre.value;changed();});box.appendChild(genre);box.appendChild(el('div',{class:'b'},[el('span',{text:(i+1)+'. '+(def?def.name:s.id)}),el('button',{type:'button',text:'Up',onclick:function(){move(c.sources,i,-1);renderCustomCatalogs();changed();}}),el('button',{type:'button',text:'Remove',onclick:function(){c.sources.splice(i,1);renderCustomCatalogs();changed();}})]));});
      } else {
        var prompt=el('input',{type:'text','aria-label':'Describe this catalog',placeholder:'Describe the movies or series you want'}),aiStatus=el('span',{class:'hint',role:'status'});
        var generateButton=el('button',{type:'button',text:'Generate filters with AI',onclick:async function(){if(!prompt.value.trim())return;generateButton.disabled=true;aiStatus.textContent='Generating filters…';var provider=c.provider,type=c.type;try{var r=await api('/api/catalogs/generate',{config:cfg,query:prompt.value,provider:provider,type:type});if(r.error){aiStatus.textContent=r.error;return;}if(c.provider!==provider||c.type!==type||!cfg.customCatalogs.includes(c)){aiStatus.textContent='Catalog changed. Generate again with the new settings.';return;}c.params=r.catalog.params;c.name=r.catalog.name;renderCustomCatalogs();changed();}finally{generateButton.disabled=false;}}});
        box.appendChild(el('div',{class:'f'},[prompt,generateButton,aiStatus]));
        var fields={simkl:[['Genre','genre'],['Format','type'],['Country','country'],['Network','network'],['Year','year'],['Sort','sort']],tmdb:[['Sort','sort_by'],['Genres','with_genres'],['Released from','primary_release_date.gte'],['Released until','primary_release_date.lte'],['Minimum rating','vote_average.gte'],['Minimum votes','vote_count.gte'],['Language','with_original_language'],['Country','with_origin_country'],['Streaming providers','with_watch_providers'],['Streaming region','watch_region'],['Keywords','with_keywords'],['Networks','with_networks']],tvdb:[['Country','country'],['Language','lang'],['Genre','genre'],['Year','year'],['Sort','sort'],['Direction','sortType'],['Status','status']],mal:[['Search','q'],['Genres','genres'],['Status','status'],['Format','type'],['Minimum score','min_score'],['From date','start_date'],['Until date','end_date'],['Sort','order_by'],['Direction','sort']],anilist:[['Search','search'],['Genres','genre_in'],['Excluded genres','genre_not_in'],['Tags','tag_in'],['Format','format'],['Status','status'],['Season','season'],['Year','seasonYear'],['Sort','sort'],['Minimum score','averageScore_greater']],movielens:[['Sort','sortBy'],['Direction','sortDirection'],['From year','minYear'],['Until year','maxYear'],['Minimum popularity','minPop'],['Tags','tag'],['Genre','genre']]};
        if(c.provider==='tmdb'&&c.type!=='movie')fields.tmdb=fields.tmdb.map(function(f){return [f[0],f[1].replace('primary_release_date','first_air_date')];});
        Object.keys(c.params).forEach(function(key){if(!(fields[c.provider]||[]).some(function(f){return f[1]===key;}))fields[c.provider].push([key,key]);});
        (fields[c.provider] || []).forEach(function(f){var input=el('input',{type:'text','aria-label':f[0],value:c.params[f[1]] || ''});input.addEventListener('input',function(){if(input.value)c.params[f[1]]=input.value;else delete c.params[f[1]];changed();});box.appendChild(el('label',{class:'f'},[el('span',{class:'t',text:f[0]}),input]));});
      }
      box.appendChild(el('button',{type:'button',text:'Remove catalog',onclick:function(){cfg.customCatalogs.splice(index,1);renderCustomCatalogs();changed();}}));
      root.appendChild(box);
    });
    enhanceSelects();
  }
  var collOptions={studios:[],networks:[],franchises:[],decades:[]};
  api('/api/collections/options').then(function(r){if(!r.error)collOptions=r;});
  function newId(){return crypto.randomUUID().replace(/-/g,'').slice(0,16);}
  function collections(){cfg.jellyfin.collections=cfg.jellyfin.collections || [];return cfg.jellyfin.collections;}
  var SHAPES=[['poster','Poster 2:3'],['landscape','Landscape 16:9'],['square','Square 1:1']];
  var GEN_KINDS=[['genres','Genres'],['people','Popular actors'],['studios','Studios'],['networks','Networks'],['franchises','Franchises'],['decades','Decades']];
  function shapeSelect(current,update,allowDefault){
    var sel=el('select',{'aria-label':'Tile shape',onchange:function(){update(sel.value||undefined);changed();}});
    if(allowDefault)sel.appendChild(el('option',{value:'',text:allowDefault}));
    SHAPES.forEach(function(o){sel.appendChild(el('option',{value:o[0],text:o[1]}));});
    sel.value=current || '';return sel;
  }
  function field(label,value,update,type,placeholder){
    var input=el('input',{type:type || 'text',value:value || '',placeholder:placeholder || '',autocomplete:'off',spellcheck:'false',oninput:function(){update(input.value);changed();}});
    return el('label',{class:'f'},[el('span',{class:'t',text:label}),input]);
  }
  function searchBox(placeholder,path,key,onPick){
    var input=el('input',{type:'text','aria-label':placeholder,placeholder:placeholder,autocomplete:'off'}),hits=el('div',{class:'b'}),timer;
    input.addEventListener('input',function(){clearTimeout(timer);clear(hits);if(!input.value.trim())return;timer=setTimeout(function(){api(path,{config:cfg,query:input.value}).then(function(r){clear(hits);if(r.error){hits.appendChild(el('span',{class:'hint',text:r.error}));return;}(r[key] || []).forEach(function(p){hits.appendChild(el('button',{type:'button',text:p.name+(p.department?' · '+p.department:''),onclick:function(){onPick(p);input.value='';clear(hits);}}));});});},350);});
    return el('div',{class:'f'},[input,hits]);
  }
  function pickList(label,list,onPick){
    var sel=el('select',{'aria-label':label});sel.appendChild(el('option',{value:'',text:label}));
    list.forEach(function(x){sel.appendChild(el('option',{value:String(x.id),text:x.name}));});
    sel.addEventListener('change',function(){if(!sel.value)return;var hit=list.find(function(x){return String(x.id)===sel.value;});onPick(hit);});
    return sel;
  }
  function sourceLabel(s){
    if(s.kind==='person')return 'Actor: '+(s.name || s.id);
    if(s.kind==='franchise')return 'Franchise: '+(s.name || s.id);
    if(s.kind==='studio')return 'Studio: '+(s.name || s.id)+' ('+(s.type || 'movie')+')';
    if(s.kind==='network')return 'Network: '+(s.name || s.id);
    if(s.kind==='discover')return 'TMDB filters ('+s.type+'): '+Object.keys(s.params || {}).map(function(k){return k+'='+s.params[k];}).join(', ');
    var def=catDefs.find(function(d){return d.id===s.id&&d.type===s.type;});return (def?def.name:'Catalog not connected')+' ('+s.type+')'+(s.genre?' · '+s.genre:'');
  }
  function exportText(list){return JSON.stringify(list.length===1?{rill:'collection',v:1,collection:list[0]}:{rill:'collections',v:1,collections:list},null,2);}
  function showExport(list){var box=$('collection-export-text');box.value=exportText(list);box.hidden=false;box.focus();box.select();try{navigator.clipboard.writeText(box.value);}catch(e){}}
  var collectionArtTarget=null;
  var ART_SHAPES=[['poster','Portrait','2:3'],['square','Square','1:1'],['landscape','Landscape','16:9']];
  function artworkUrl(value) {try {var u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch(_){return '';}}
  function coverShape(col) {return col.coverShape || (col.cover?'poster':col.backdrop?'landscape':'poster');}
  function artworkImage(url,name,shape,extra) {
    var frame=el('div',{class:'art-image '+(extra || ''),'data-shape':shape || 'poster'});
    var fallback=el('span',{class:'art-placeholder'},[el('span',{'aria-hidden':'true',text:'▧'}),el('small',{text:url?'Loading image…':'No custom image'})]);frame.appendChild(fallback);
    var safe=artworkUrl(url);
    if(safe){
      var img=el('img',{alt:name || '',referrerpolicy:'no-referrer',decoding:'async',onload:function(){frame.classList.add('loaded');fallback.hidden=true;},onerror:function(){img.remove();fallback.querySelector('small').textContent='Image unavailable';frame.classList.add('image-error');}});
      frame.appendChild(img);img.src=safe;
    }else if(url)fallback.querySelector('small').textContent='Invalid image URL';
    return frame;
  }
  function openCollectionArtwork(target) {collectionArtTarget=target;renderCollections();}
  function artworkThumbnail(item,shape,onClick,label) {
    var button=el('button',{type:'button',class:'art-thumbnail','aria-label':label,onclick:onClick},[artworkImage(item.cover || item.backdrop,item.name,shape)]);return button;
  }
  function shapeChooser(current,onChange,label,allowDefault) {
    var wrap=el('div',{class:'art-shape-field'});wrap.appendChild(el('span',{class:'t',text:label}));
    var choices=el('div',{class:'art-shapes',role:'group','aria-label':label});
    function sync(){all('[data-shape-choice]',choices).forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.shapeChoice===current()));});}
    ART_SHAPES.forEach(function(o){var button=el('button',{type:'button','data-shape-choice':o[0],'aria-label':o[1]+' '+o[2],onclick:function(){onChange(o[0]);sync();}},[el('span',{class:'shape-outline','data-shape':o[0],'aria-hidden':'true'}),el('span',{text:o[1]}),el('small',{text:o[2]})]);choices.appendChild(button);});
    choices._syncShape=sync;wrap.appendChild(choices);sync();
    if(allowDefault)wrap.appendChild(collectionButton('Use library default',function(){onChange(undefined);sync();}));
    return wrap;
  }
  function boxSetRow(col,selected,onSelect,hideHeading) {
    var preview=el('section',{class:'boxset-preview','aria-label':'Box-set row preview'});
    if(!hideHeading)preview.appendChild(el('div',{class:'boxset-preview-heading'},[el('h3',{},[el('span',{text:col.name || 'Collection'}),el('span',{class:'boxset-count',text:String((col.folders || []).length)})]),el('small',{text:'Artwork preview'})]));
    var row=el('div',{class:'boxset-row'});
    (col.folders || []).forEach(function(f){
      var shape=f.shape || col.shape || 'poster';
      var tile=el('button',{type:'button',class:'boxset-card','data-shape':shape,'data-boxset-id':f.id,'aria-label':'Select box set '+f.name,'aria-pressed':String(f.id===selected),onclick:function(){onSelect(f);}},[artworkImage(f.cover,f.name,shape),el('strong',{text:f.name || 'Untitled box set'})]);
      row.appendChild(tile);
    });
    if(!row.children.length)row.appendChild(el('p',{class:'hint',text:'Add a box set to see it here.'}));
    preview.appendChild(row);preview.appendChild(el('p',{class:'boxset-preview-note',text:'Artwork preview. Home rows and card layout depend on your Jellyfin app.'}));return preview;
  }
  function revealSelectedBoxSet(row) {
    var tile=row.querySelector('[aria-pressed=true]');if(!tile)return;
    if(tile.offsetLeft<row.scrollLeft)row.scrollLeft=tile.offsetLeft;
    else if(tile.offsetLeft+tile.offsetWidth>row.scrollLeft+row.clientWidth)row.scrollLeft=tile.offsetLeft+tile.offsetWidth-row.clientWidth;
  }
  function renderArtworkWorkbench(root,col,item) {
    var isBox=item!==col, title=isBox?item.name:col.name;
    root.appendChild(el('div',{class:'collection-editor-nav'},[collectionButton('← Back to box sets',function(){collectionArtTarget=null;if(isBox)selectedGroupId=item.id;renderCollections();}),el('span',{class:'art-context',text:'Artwork'})]));
    var layout=el('div',{class:'art-workbench'}),controls=el('div',{class:'art-controls'}),preview=el('div');
    var secondaryPreview=el('div',{class:'art-secondary-preview'}),libraryCover=el('span');
    var selectedShape=function(){return isBox?(item.shape || col.shape || 'poster'):coverShape(col);};
    function drawPreview(){
      all('.art-shapes',controls).forEach(function(choices){if(choices._syncShape)choices._syncShape();});
      var old=preview.querySelector('.boxset-row'),scroll=old?old.scrollLeft:0;
      clear(preview);preview.appendChild(boxSetRow(col,isBox?item.id:null,function(f){openCollectionArtwork(f.id);var selected=$('jf-collections').querySelector('.boxset-card[aria-pressed=true]');if(selected)selected.focus({preventScroll:true});}));
      preview.querySelector('.boxset-row').scrollLeft=scroll;
      clear(secondaryPreview);
      if(item.backdrop)secondaryPreview.appendChild(artworkImage(item.backdrop,'Backdrop for '+title,'landscape'));
      if(isBox && item.logo)secondaryPreview.appendChild(artworkImage(item.logo,'Logo for '+title,'landscape','art-logo-preview'));
      if(!isBox){clear(libraryCover);libraryCover.appendChild(artworkImage(col.cover || col.backdrop,title,coverShape(col)));}
    }
    controls.appendChild(el('div',{class:'art-editor-heading'},[isBox?null:libraryCover,el('h3',{text:isBox?title+' · artwork':'Library artwork'})]));
    controls.appendChild(shapeChooser(selectedShape,function(value){if(isBox)item.shape=value;else col.coverShape=value;changed();drawPreview();},'Image shape',isBox));
    function imageField(label,key,hint,parent){
      var box=el('div',{class:'art-url-field'}),id='art-'+key+'-url';
      box.appendChild(el('label',{class:'t',for:id,text:label}));
      var input=el('input',{id:id,type:'url',value:item[key] || '',placeholder:'https://…/image.jpg',spellcheck:'false',autocomplete:'off','aria-describedby':id+'-status'});
      var status=el('p',{id:id+'-status',class:'art-image-status',role:'status',text:hint}),timer,probe,revision=0;
      function update(){
        clearTimeout(timer);timer=null;var raw=input.value.trim(),url=artworkUrl(raw),version=++revision;
        input.setAttribute('aria-invalid',String(!!raw&&!url));
        if(raw&&!url){status.textContent='Enter a complete http or https image URL.';return;}
        item[key]=raw || undefined;changed();drawPreview();
        if(!url){status.textContent=hint;return;}
        status.textContent='Loading preview…';
        probe=new Image();probe.referrerPolicy='no-referrer';
        probe.onload=function(){if(version!==revision||!box.isConnected)return;status.textContent='Loaded · '+probe.naturalWidth+' × '+probe.naturalHeight;};
        probe.onerror=function(){if(version!==revision||!box.isConnected)return;status.textContent='Couldn’t load this image. Check the URL or try another host.';};probe.src=url;
      }
      input.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(update,350);});
      input.addEventListener('blur',function(){if(timer){clearTimeout(timer);timer=null;update();}});
      var clearButton=collectionButton('Clear',function(){input.value='';update();input.focus();},'Clear '+label);
      box.appendChild(el('div',{class:'art-url-control'},[input,clearButton]));box.appendChild(status);(parent || controls).appendChild(box);
    }
    imageField('Primary cover URL','cover',isBox?'Leave empty to use artwork from this box set’s content.':'The image shown for this library on the home screen.');
    var extra=collectionDisclosure('Backdrop and logo','art-extra-'+item.id);extra.appendChild(secondaryPreview);
    imageField('Backdrop URL','backdrop','Optional background for the detail page.',extra);
    if(isBox)imageField('Logo URL','logo','Optional transparent logo.',extra);
    else extra.querySelector('summary').textContent='Backdrop';
    controls.appendChild(extra);
    if(!isBox) {
      var defaults=collectionDisclosure('Default shape for box sets','art-default-'+col.id);
      defaults.appendChild(shapeChooser(function(){return col.shape || 'poster';},function(value){col.shape=value;changed();drawPreview();},'Default box-set shape'));controls.appendChild(defaults);
    }
    layout.appendChild(preview);layout.appendChild(controls);root.appendChild(layout);drawPreview();
    revealSelectedBoxSet(preview.querySelector('.boxset-row'));
  }

  var selectedCollectionId=null, selectedGroupId=null, collectionDisclosureState={};
  function collectionDisclosure(title,key) {
    var details=el('details',{class:'collection-disclosure','data-collection-detail':key},[el('summary',{text:title})]);
    details.open=!!collectionDisclosureState[key];
    details.addEventListener('toggle',function(){collectionDisclosureState[key]=details.open;});
    return details;
  }
  function collectionButton(text,fn,label) {return el('button',{type:'button',text:text,'aria-label':label || text,onclick:fn});}
  function editCollection(id) {$('collection-import').hidden=true;$('collection-export-text').hidden=true;selectedCollectionId=id;selectedGroupId=null;collectionArtTarget=null;renderCollections();var name=$('collection-name');if(name)name.focus();}
  function closeCollection() {$('collection-import').hidden=true;$('collection-export-text').hidden=true;selectedCollectionId=null;selectedGroupId=null;collectionArtTarget=null;renderCollections();$('collection-add').focus();}
  function renderCollections() {
    var root=$('jf-collections'),oldRow=root.querySelector('.boxset-row'),rowScroll=oldRow?oldRow.scrollLeft:0;
    if(typeof closePicker==='function')closePicker(false);
    all('[data-collection-detail]',root).forEach(function(d){collectionDisclosureState[d.dataset.collectionDetail]=d.open;});
    clear(root);
    var col=collections().find(function(c){return c.id===selectedCollectionId;});
    $('collections-empty').hidden=!!col || collections().length>0;
    $('collections-toolbar').hidden=!!col;
    $('collections-intro').hidden=!!col;
    document.querySelector('#s-collections h2').textContent=col?'Edit collection':'Collections';
    var pickable=catDefs.filter(function(d){return !(d.extra || []).some(function(e){return e.isRequired;});});
    if(!col) {
      collections().forEach(function(c,ci){
        var count=(c.folders || []).length, automatic=(c.generators || []).length;
        var subtitle=count+' box set'+(count===1?'':'s')+(automatic?' · '+automatic+' automatic':'');
        var title=el('div',{class:'collection-row-title'},[el('strong',{text:c.name || 'Untitled collection'}),el('small',{text:subtitle})]);
        var edit=collectionButton('Edit',function(){editCollection(c.id);},'Edit '+(c.name || 'collection'));
        var up=collectionButton('↑',function(){move(collections(),ci,-1);renderCollections();changed();},'Move '+c.name+' up');up.disabled=ci===0;
        var down=collectionButton('↓',function(){move(collections(),ci,1);renderCollections();changed();},'Move '+c.name+' down');down.disabled=ci===collections().length-1;
        root.appendChild(el('div',{class:'collection-list-row'},[artworkThumbnail(c,coverShape(c),function(){selectedCollectionId=c.id;openCollectionArtwork('library');},'Edit artwork for '+c.name),title,el('div',{class:'ud'},[up,down]),edit]));
      });
      return;
    }
    if(collectionArtTarget){
      var artItem=collectionArtTarget==='library'?col:(col.folders || []).find(function(f){return f.id===collectionArtTarget;});
      if(artItem){document.querySelector('#s-collections h2').textContent='Collection artwork';renderArtworkWorkbench(root,col,artItem);enhanceSelects();return;}
      collectionArtTarget=null;
    }
    var top=el('div',{class:'collection-editor-nav'},[collectionButton('← All collections',closeCollection),el('span',{class:'hint',text:'Changes apply as you edit.'})]);
    root.appendChild(top);
    var name=field('Collection name',col.name,function(v){col.name=v;var heading=root.querySelector('.boxset-preview-heading h3');if(heading)heading.querySelector('span').textContent=v || 'Collection';},'text','e.g. Weekend movies');name.querySelector('input').id='collection-name';root.appendChild(el('div',{class:'collection-visual-identity'},[artworkThumbnail(col,coverShape(col),function(){openCollectionArtwork('library');},'Edit library artwork'),name,collectionButton('Artwork',function(){openCollectionArtwork('library');},'Edit library artwork')]));
    var groupHeading=el('div',{class:'collection-group-heading'},[el('div',{},[el('h3',{},['Box sets',el('span',{class:'boxset-count',text:String((col.folders || []).length)})]),el('p',{class:'hint',text:'Connect add-on catalogs to each box set.'})]),collectionButton('+ Add box set',function(){col.folders=col.folders || [];var f={id:newId(),name:'New box set',sources:[]};col.folders.push(f);selectedGroupId=f.id;renderCollections();changed();var input=$('group-name');if(input){input.focus();input.select();}})]);
    root.appendChild(groupHeading);
    if(!(col.folders || []).length)root.appendChild(el('p',{class:'collection-inline-empty',text:'Add a box set, then connect a catalog.'}));
    if((col.folders || []).length){
      if(!(col.folders || []).some(function(f){return f.id===selectedGroupId;}))selectedGroupId=col.folders[0].id;
      root.appendChild(boxSetRow(col,selectedGroupId,function(f){selectedGroupId=f.id;renderCollections();var selected=root.querySelector('.boxset-card[aria-pressed=true]');if(selected)selected.focus({preventScroll:true});},true));
      root.querySelector('.boxset-row').scrollLeft=rowScroll;revealSelectedBoxSet(root.querySelector('.boxset-row'));
    }
    (col.folders || []).forEach(function(f,fi){
      var active=selectedGroupId===f.id;
      if(!active)return;
      var group=el('div',{class:'collection-group editing'});
      if(active){
        var editor=el('div',{class:'collection-group-editor'});
        var groupName=field('Box-set name',f.name,function(v){f.name=v;var artButton=group.querySelector('.collection-boxset-name > button');if(artButton)artButton.setAttribute('aria-label','Artwork for '+v);all('[data-boxset-id]',root).forEach(function(tile){if(tile.dataset.boxsetId===f.id){tile.querySelector('strong').textContent=v || 'Untitled box set';tile.setAttribute('aria-label','Select box set '+v);}});});groupName.querySelector('input').id='group-name';editor.appendChild(el('div',{class:'collection-boxset-name'},[groupName,collectionButton('Artwork',function(){openCollectionArtwork(f.id);},'Artwork for '+f.name)]));
        function addSource(source) {
          f.sources=f.sources || [];
          if(f.sources.some(function(s){return s.kind===source.kind && s.id===source.id && s.type===source.type && s.kind!=='discover';}))return;
          f.sources.push(source);
          if(!f.name || f.name==='New group' || f.name==='New box set' || f.name==='New tile'){var d=catDefs.find(function(d){return d.id===source.id && d.type===source.type;});f.name=source.name || (d?d.name:'New box set');}
          renderCollections();changed();
        }
        var sources=el('div',{class:'collection-sources'});
        (f.sources || []).forEach(function(source,si){
          var sourceBox=el('div',{class:'collection-source'});
          var sourceUp=collectionButton('↑',function(){move(f.sources,si,-1);renderCollections();changed();},'Move source '+(si+1)+' up');sourceUp.disabled=si===0;
          sourceBox.appendChild(el('div',{class:'collection-source-row'},[el('span',{text:sourceLabel(source)}),sourceUp,collectionButton('×',function(){f.sources.splice(si,1);renderCollections();changed();},'Remove '+sourceLabel(source))]));
          if(source.kind==='catalog' && cfg.advanced) {
            var filter=collectionDisclosure('Filter this catalog','source-'+f.id+'-'+si);
            filter.appendChild(field('Genre or filter',source.genre,function(v){source.genre=v;},'text','Optional'));sourceBox.appendChild(filter);
          }
          if(source.kind==='studio') {
            var media=el('select',{'aria-label':'Studio media',onchange:function(){source.type=media.value;changed();}});
            [['movie','Movies'],['series','Series']].forEach(function(o){media.appendChild(el('option',{value:o[0],text:o[1]}));});media.value=source.type || 'movie';sourceBox.appendChild(media);
          }
          if(source.kind==='discover') {
            var settings=collectionDisclosure('Edit filters','source-'+f.id+'-'+si);
            var media=el('select',{'aria-label':'Filter media',onchange:function(){source.type=media.value;changed();}});
            [['movie','Movies'],['series','Series']].forEach(function(o){media.appendChild(el('option',{value:o[0],text:o[1]}));});media.value=source.type;settings.appendChild(media);
            var params=el('textarea',{rows:'3','aria-label':'TMDB discover filters',placeholder:'with_genres=28',spellcheck:'false'});params.value=Object.keys(source.params || {}).map(function(k){return k+'='+source.params[k];}).join('\n');
            params.addEventListener('input',function(){var values={};params.value.split('\n').forEach(function(line){var i=line.indexOf('=');if(i>0)values[line.slice(0,i).trim()]=line.slice(i+1).trim();});source.params=values;changed();});settings.appendChild(params);sourceBox.appendChild(settings);
          }
          sources.appendChild(sourceBox);
        });
        editor.appendChild(sources);
        var catalogPicker=el('div',{class:'collection-catalog-picker'});
        var catalogSelect=el('select',{'aria-label':'Connect a catalog'});catalogSelect.appendChild(el('option',{value:'',text:'+ Connect a catalog…'}));
        pickable.filter(function(d){return !(f.sources || []).some(function(s){return s.kind==='catalog'&&s.id===d.id&&s.type===d.type;});}).forEach(function(d){catalogSelect.appendChild(el('option',{value:d.type+'|'+d.id,text:d.name+' · '+(d.type==='movie'?'Movies':d.type==='series'?'Series':d.type)}));});
        catalogSelect.addEventListener('change',function(){if(!catalogSelect.value)return;var parts=catalogSelect.value.split('|');addSource({kind:'catalog',type:parts[0],id:parts.slice(1).join('|')});});
        catalogPicker.appendChild(catalogSelect);
        if(!pickable.length)catalogPicker.appendChild(el('p',{class:'hint'},[el('a',{href:'#addons',text:'Add an add-on'}),' to connect its catalogs here.']));
        editor.appendChild(catalogPicker);
        if(cfg.advanced){
        var otherSources=collectionDisclosure('Other sources','other-sources-'+f.id);
        var composer=el('div',{class:'collection-composer'}), choices=el('div',{class:'collection-source-choice'});
        var sourceKind=el('select',{'aria-label':'Content to add'});
        [['','+ Add content…'],['catalog','Catalog'],['person','Actor or director'],['franchise','Franchise'],['studio','Studio'],['network','TV network']].concat(cfg.advanced?[['discover','TMDB filters']]:[]).forEach(function(o){sourceKind.appendChild(el('option',{value:o[0],text:o[1]}));});
        sourceKind.addEventListener('change',function(){
          clear(choices);
          if(sourceKind.value==='catalog') {
            var select=el('select',{'aria-label':'Choose catalog'});select.appendChild(el('option',{value:'',text:'Choose a catalog…'}));
            pickable.forEach(function(d){select.appendChild(el('option',{value:d.type+'|'+d.id,text:d.name+' ('+d.type+')'}));});
            select.addEventListener('change',function(){if(!select.value)return;var parts=select.value.split('|');addSource({kind:'catalog',type:parts[0],id:parts[1]});});choices.appendChild(select);
            if(!pickable.length)choices.appendChild(el('p',{class:'hint',text:'Connect a catalog source in Add-ons first.'}));
          } else if(sourceKind.value==='person')choices.appendChild(searchBox('Search actors or directors','/api/people/search','people',function(hit){addSource({kind:'person',id:hit.id,name:hit.name});}));
          else if(sourceKind.value==='franchise')choices.appendChild(searchBox('Search franchises','/api/franchises/search','franchises',function(hit){addSource({kind:'franchise',id:hit.id,name:hit.name});}));
          else if(sourceKind.value==='studio')choices.appendChild(pickList('Choose studio',collOptions.studios,function(hit){addSource({kind:'studio',id:hit.id,name:hit.name,type:'movie'});}));
          else if(sourceKind.value==='network')choices.appendChild(pickList('Choose TV network',collOptions.networks,function(hit){addSource({kind:'network',id:hit.id,name:hit.name});}));
          else if(sourceKind.value==='discover')addSource({kind:'discover',type:'movie',params:{sort_by:'popularity.desc'}});
          if(sourceKind.value && sourceKind.value!=='catalog' && !cfg.keys.tmdb)choices.appendChild(el('p',{class:'hint',text:'Requires your TMDB key in Metadata.'}));
          enhanceSelects();
        });
        composer.appendChild(sourceKind);composer.appendChild(choices);otherSources.appendChild(composer);editor.appendChild(otherSources);
        }
        var appearance=collectionDisclosure('Box-set actions','group-appearance-'+f.id);
        editor.appendChild(appearance);
        var up=collectionButton('Move up',function(){move(col.folders,fi,-1);renderCollections();changed();});up.disabled=fi===0;
        var down=collectionButton('Move down',function(){move(col.folders,fi,1);renderCollections();changed();});down.disabled=fi===col.folders.length-1;
        appearance.appendChild(el('div',{class:'b collection-group-actions'},[up,down,collectionButton('Remove box set',function(){col.folders.splice(fi,1);selectedGroupId=null;renderCollections();changed();})]));
        group.appendChild(editor);
      }
      root.appendChild(group);
    });
    var appearance=collectionDisclosure('Collection settings','collection-appearance-'+col.id);
    appearance.appendChild(field('Description',col.description,function(v){col.description=v;},'text','Optional'));
    if((cfg.jellyfin.profiles || []).length){
      appearance.appendChild(el('p',{class:'hint',text:'Show to these profiles. Leave all unchecked for everyone.'}));
      var profiles=el('div',{class:'checks'});cfg.jellyfin.profiles.forEach(function(p){var input=el('input',{type:'checkbox',checked:(col.profiles || []).includes(p.id),onchange:function(){col.profiles=(col.profiles || []).filter(function(id){return id!==p.id;});if(input.checked)col.profiles.push(p.id);changed();}});profiles.appendChild(el('label',{},[input,p.name]));});appearance.appendChild(profiles);
    }
    root.appendChild(appearance);
    if((col.generators || []).length || cfg.advanced){
      var gens=collectionDisclosure('Automatic groups'+((col.generators || []).length?' · '+col.generators.length:''),'automatic-'+col.id);
      gens.appendChild(el('p',{class:'hint',text:'Optional: create groups from genres, people or studios. Requires TMDB except for catalog genres.'}));
      (col.generators || []).forEach(function(g,gi){
        var row=el('div',{class:'b'});
        var kind=el('select',{'aria-label':'Auto row kind',onchange:function(){g.kind=kind.value;delete g.catalog;delete g.ids;renderCollections();changed();}});
        GEN_KINDS.forEach(function(o){kind.appendChild(el('option',{value:o[0],text:o[1]}));});kind.value=g.kind;row.appendChild(kind);
        if(g.kind==='genres'){
          var src=el('select',{'aria-label':'Genre source',onchange:function(){if(src.value==='movie'||src.value==='series'){delete g.catalog;g.type=src.value;}else{var parts=src.value.split('|');g.catalog={type:parts[0],id:parts[1]};delete g.type;}changed();}});
          src.appendChild(el('option',{value:'movie',text:'TMDB movie genres'}));src.appendChild(el('option',{value:'series',text:'TMDB series genres'}));
          pickable.filter(function(d){return d.genres||(d.extra || []).some(function(e){return e.name==='genre';});}).forEach(function(d){src.appendChild(el('option',{value:d.type+'|'+d.id,text:'Genres of '+d.name+' ('+d.type+')'}));});
          src.value=g.catalog?g.catalog.type+'|'+g.catalog.id:(g.type || 'movie');row.appendChild(src);
        } else if(g.kind==='decades'||g.kind==='studios'){
          var media=el('select',{'aria-label':'Media',onchange:function(){g.type=media.value;changed();}});[['movie','Movies'],['series','Series']].forEach(function(o){media.appendChild(el('option',{value:o[0],text:o[1]}));});media.value=g.type || 'movie';row.appendChild(media);
        }
        if(g.kind==='studios'||g.kind==='networks'||g.kind==='franchises'||g.kind==='people'){
          var picked=el('span',{class:'hint',text:(g.ids && g.ids.length)?g.ids.length+' chosen':'all curated'});
          var list=g.kind==='studios'?collOptions.studios:g.kind==='networks'?collOptions.networks:g.kind==='franchises'?collOptions.franchises:[];
          if(list.length)row.appendChild(pickList('Only these…',list,function(hit){g.ids=g.ids || [];if(g.ids.indexOf(hit.id)<0)g.ids.push(hit.id);renderCollections();changed();}));
          if(g.kind==='people')row.appendChild(searchBox('Only these actors…','/api/people/search','people',function(p){g.ids=g.ids || [];if(g.ids.indexOf(p.id)<0)g.ids.push(p.id);renderCollections();changed();}));
          if(g.kind==='franchises')row.appendChild(searchBox('Find a franchise…','/api/franchises/search','franchises',function(p){g.ids=g.ids || [];if(g.ids.indexOf(p.id)<0)g.ids.push(p.id);renderCollections();changed();}));
          row.appendChild(picked);
          if(g.ids && g.ids.length)row.appendChild(el('button',{type:'button',text:'Use all',onclick:function(){delete g.ids;renderCollections();changed();}}));
        }
        var limit=el('input',{type:'number',min:'1',max:'100','aria-label':'Maximum tiles',value:g.limit || 30,oninput:function(){g.limit=Number(limit.value) || 30;changed();}});row.appendChild(el('label',{class:'f'},[el('span',{class:'t',text:'Max tiles'}),limit]));
        row.appendChild(el('label',{class:'f'},[el('span',{class:'t',text:'Shape'}),shapeSelect(g.shape,function(v){g.shape=v;},'Auto')]));
        row.appendChild(el('button',{type:'button',text:'Remove',onclick:function(){col.generators.splice(gi,1);renderCollections();changed();}}));
        var genName=(GEN_KINDS.find(function(k){return k[0]===g.kind;}) || ['',g.kind])[1];
        var genDetails=collectionDisclosure(genName+' · up to '+(g.limit || 30)+' groups','generator-'+g.id);genDetails.appendChild(row);gens.appendChild(genDetails);
      });
      gens.appendChild(el('button',{type:'button',text:'Add automatic groups',onclick:function(){col.generators=col.generators || [];col.generators.push({id:newId(),kind:'genres',type:'movie',limit:30});renderCollections();changed();}}));

      root.appendChild(gens);
    }
    var more=collectionDisclosure('More actions','actions-'+col.id);
    more.appendChild(el('div',{class:'b'},[collectionButton('Export collection',function(){showExport([col]);}),collectionButton('Duplicate',function(){var copy=clone(col);copy.id=newId();copy.name=col.name+' copy';(copy.folders || []).forEach(function(f){f.id=newId();});(copy.generators || []).forEach(function(g){g.id=newId();});collections().push(copy);changed();editCollection(copy.id);}),collectionButton('Remove collection',function(){var index=collections().findIndex(function(c){return c.id===col.id;});if(index>=0)collections().splice(index,1);changed();closeCollection();})]));root.appendChild(more);
    enhanceSelects();
  }
  $('collection-add').addEventListener('click',function(){var col={id:newId(),name:'My collection',folders:[],generators:[]};collections().push(col);editCollection(col.id);changed();$('collection-name').select();});
  $('collection-import-toggle').addEventListener('click',function(){var box=$('collection-import');box.hidden=!box.hidden;if(!box.hidden)$('collection-import-text').focus();});
  $('collection-export-all').addEventListener('click',function(){showExport(collections());});
  $('collection-import-btn').addEventListener('click',function(){var text=$('collection-import-text').value.trim();if(!text)return;var status=$('collection-import-status');status.textContent='Importing…';api('/api/collections/import',{data:text}).then(function(r){if(r.error){status.textContent=r.error;return;}var have=collections();r.collections.forEach(function(c){if(have.some(function(x){return x.id===c.id;}))c.id=newId();have.push(c);});status.textContent=r.collections.length+' imported.';$('collection-import-text').value='';renderCollections();changed();});});
  $('add-custom-catalog').addEventListener('click',function(){cfg.customCatalogs=cfg.customCatalogs || [];cfg.customCatalogs.push({id:crypto.randomUUID(),name:'My catalog',provider:'tmdb',type:'movie',params:{}});renderCustomCatalogs();changed();});
  var recommendationPoll;
  function recommendationProgress(r){
    clearTimeout(recommendationPoll);var job=r.job;
    $('rec-status').textContent=r.error||(!job?'No generation recorded yet.':job.status==='failed'?job.error:job.status==='done'?(Object.values(job.counts).some(function(n){return n>0;})?'Recommendations are ready.':'No matches yet. Add viewing history or lower the minimum votes.'):'Preparing recommendations: '+job.position+' of 3 sections. You can close this page.');
    if(job&&job.status==='pending')recommendationPoll=setTimeout(function(){api('/api/recommendations/status',{config:cfg,id:job.id}).then(recommendationProgress);},5000);
  }
  ['prepare','rebuild'].forEach(function(action){$(action+'-recommendations').addEventListener('click',function(){var button=this;button.disabled=true;$('rec-status').textContent='Queuing recommendations…';api('/api/recommendations/generate',{config:cfg,rebuild:action==='rebuild'}).then(recommendationProgress).finally(function(){button.disabled=false;});});});
  $('check-recommendations').addEventListener('click',function(){api('/api/recommendations/status',cfg).then(recommendationProgress);});
  function movieLensResult(r){var s=r.status||{};$('ml-result').textContent=r.error||s.error||(s.checkedAt?'Last checked '+new Date(s.checkedAt).toLocaleString()+'. ':'')+(s.successCount!==undefined?s.successCount+' imported, '+s.alreadyRatedCount+' already rated, '+s.errorCount+' rejected.':s.checkedAt?'No changed ratings.':'No import recorded yet.');}
  ['sync','status'].forEach(function(action){$('ml-'+action).addEventListener('click',function(){var button=this;button.disabled=true;$('ml-result').textContent=action==='sync'?'Importing ratings…':'Checking…';api('/api/movielens/'+action,cfg).then(movieLensResult).finally(function(){button.disabled=false;});});});
  $('ml-csv').addEventListener('change',async function(){var file=this.files[0];if(!file)return;if(file.size>5000000){$('ml-result').textContent='Choose a file smaller than 5 MB.';return;}this.disabled=true;try{movieLensResult(await api('/api/movielens/import',{config:cfg,csv:await file.text()}));}finally{this.disabled=false;this.value='';}});
  renderCustomCatalogs();
  function swapCatalog(a, b) { var t = cfg.catalogs[a]; cfg.catalogs[a] = cfg.catalogs[b]; cfg.catalogs[b] = t; renderCatalogs(); changed(); }

  var NEEDS = {
    tmdb: { label: 'TMDB key', tab: 'meta', field: 'k-tmdb', ok: function () { return !!cfg.keys.tmdb; } },
    tvdb: { label: 'TVDB key', tab: 'meta', field: 'k-tvdb', ok: function () { return !!cfg.keys.tvdb; } },
    fanart: { label: 'Fanart.tv key', tab: 'meta', field: 'k-fanart', ok: function () { return !!cfg.keys.fanart; } },
    rpdb: { label: 'RPDB key', tab: 'meta', field: 'k-rpdb', ok: function () { return !!cfg.keys.rpdb; } },
    mdblist: { label: 'MDBList key', tab: 'tracking', field: 'k-mdblist', ok: function () { return !!cfg.keys.mdblist; } },
    publicmetadb: { label: 'PublicMetaDB key', tab: 'tracking', field: 'k-publicmetadb', ok: function () { return !!cfg.keys.publicmetadb; } },
    trakt: { label: 'Trakt account', tab: 'tracking', field: 'trakt-id', ok: function () { return !!(cfg.trackers.trakt && cfg.trackers.trakt.accessToken); } },
    simkl: { label: 'Simkl account', tab: 'tracking', field: 'simkl-id', ok: function () { return !!(cfg.trackers.simkl && cfg.trackers.simkl.accessToken); } },
    mal: { label: 'MyAnimeList account', tab: 'tracking', field: 'mal-id', ok: function () { return !!(cfg.trackers.mal && cfg.trackers.mal.accessToken); } },
    anilist: { label: 'AniList account', tab: 'tracking', field: 'anilist-id', ok: function () { return !!(cfg.trackers.anilist && cfg.trackers.anilist.accessToken); } },
    ai: { label: 'AI key and model', tab: 'catalogs', field: 'rec-key', ok: function () { var r = cfg.recommendations || {}; return !!(r.apiKey && r.model); } }
  };
  var OPTION_NEEDS = { tmdb: 'tmdb', tvdb: 'tvdb', fanart: 'fanart', rpdb: 'rpdb' };
  function needOk(n) { var d = NEEDS[n]; return !d || !!d.ok(); }
  function needTag(n, short) {
    var d = NEEDS[n];
    return el('button', { type: 'button', class: 'need-tag', title: 'Needs ' + d.label, text: short ? (/account$/.test(d.label) ? 'Connect' : 'Add key') : 'Needs ' + d.label, onclick: function (e) {
      e.preventDefault(); e.stopPropagation();
      if (!cfg.advanced) { cfg.advanced = true; applyMode(); changed(); }
      location.hash = d.tab; selectTab(d.tab, false);
      var f = $(d.field); if (f) { var parent = f.parentElement; while(parent) { if(parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement; } f.scrollIntoView({ block: 'center' }); f.focus(); }
    } });
  }
  function lockSelect(select, needFor, hintFor) {
    if (!select) return;
    Array.from(select.options).forEach(function (o) {
      if (!o.dataset.label) o.dataset.label = o.textContent;
      var n = needFor(o.value); o.disabled = !!n && !needOk(n);
      o.textContent = o.dataset.label + (o.disabled ? ' · needs ' + NEEDS[n].label.replace(' account', '').replace(' key', ' key') : '');
    });
    var wrap = select.closest('.f'), hint = wrap.querySelector('.need-hint'), cur = select.options[select.selectedIndex];
    if (cur && cur.disabled) { if (!hint) { hint = el('p', { class: 'hint need-hint' }); wrap.appendChild(hint); } hint.textContent = hintFor(cur.value); }
    else if (hint) hint.remove();
    if (select._picker) select._picker.sync();
  }
  function refreshTrackingSummary() {
    var storage=$('tracking-storage-note');if(!storage)return;
    storage.textContent=account.durable ? 'Resume positions and watched status are stored in your Rill server’s database, including when Server only is selected. They are available to your other Jellyfin clients.' : 'This preview has no server database. On a deployed Rill server, resume positions and watched status are stored in your server’s database, even without a tracker.';
    var names={trakt:'Trakt',simkl:'Simkl',mdblist:'MDBList',publicmetadb:'PublicMetaDB',mal:'MyAnimeList',anilist:'AniList'}, primary=cfg.trackers.primary;
    var targets=Array.from(new Set([primary].concat(cfg.trackers.scrobbleTo || []))).filter(function(name){return name!=='off' && needOk(name);});
    var sending=targets.filter(function(name){var media=(cfg.trackers.media || {})[name] || {};return media.movie!==false || media.series!==false;});
    var text=primary==='off'?'History source: server only.':needOk(primary)?'History source: '+names[primary]+' plus server records.':'The selected tracker is not connected; server history is used.';
    text+=sending.length?' Watch updates are sent to '+sending.map(function(name){return names[name];}).join(', ')+'.':' No watch updates are sent to external trackers.';
    if(primary==='mal' || primary==='anilist')text+=' This tracker supplies anime progress; exact resume positions stay on the server.';
    $('tracking-sync-status').textContent=text;
    all('[data-arr="trackers.scrobbleTo"]').forEach(function(input){input.checked=input.value===primary || (cfg.trackers.scrobbleTo || []).includes(input.value);input.disabled=input.value===primary || (!needOk(input.value) && !input.checked);});
  }
  function refreshNeeds() {
    all('[data-needs]').forEach(function (node) {
      var n = node.getAttribute('data-needs'), ok = needOk(n);
      node.classList.toggle('locked', !ok);
      var tag = node.querySelector(':scope > .need-tag');
      if (!ok && !tag) node.appendChild(needTag(n, node.tagName === 'LABEL'));
      if (ok && tag) tag.remove();
      all('input[type=checkbox]', node).forEach(function (i) { i.disabled = !ok && !i.checked; });
    });
    ['p-movie', 'p-series'].forEach(function (id) { lockSelect($(id), function (v) { return OPTION_NEEDS[v]; }, function (v) { return (LABELS[v] || v) + ' needs a key. Choose Off or another provider until you add one.'; }); });
    lockSelect($('p-anime'), function (v) { return OPTION_NEEDS[v]; }, function (v) { return (LABELS[v] || v) + ' needs a key. Choose Off or another provider until you add one.'; });
    lockSelect($('tr-primary'), function (v) { return v === 'off' ? null : v; }, function (v) { return 'Connect ' + NEEDS[v].label.replace(' account', '') + ' below to use it as your primary tracker.'; });
    all('[data-order]').forEach(renderOrder);
    refreshTrackingSummary();
    all('[data-key-status]').forEach(function (pill) { var on = !!cfg.keys[pill.getAttribute('data-key-status')]; pill.textContent = on ? 'Set' : 'Not set'; pill.classList.toggle('on', on); });
    var req = $('rec-req');
    if (req) { clear(req); [['ai', 'AI key and model'], ['tmdb', 'TMDB key']].forEach(function (r) { var ok = needOk(r[0]); req.appendChild(el('span', { class: 'req' + (ok ? ' on' : ''), text: (ok ? '✓ ' : '○ ') + r[1] })); }); }
  }

  function renderOrder(box) {
    var path = box.getAttribute('data-order');
    var opts = box.getAttribute('data-options').split(',');
    var chosen = (get(path) || []).filter(function (v) { return opts.indexOf(v) >= 0; });
    var rest = opts.filter(function (v) { return chosen.indexOf(v) < 0; });
    clear(box);
    chosen.concat(rest).forEach(function (v, i) {
      var on = i < chosen.length;
      var need = OPTION_NEEDS[v], locked = !!need && !needOk(need);
      var cb = el('input', { type: 'checkbox', 'aria-label': 'Enable ' + (LABELS[v] || v), disabled: locked && !on });
      cb.checked = on;
      cb.addEventListener('change', function () {
        var arr = chosen.slice();
        if (cb.checked) arr.push(v); else arr.splice(arr.indexOf(v), 1);
        set(path, arr); renderOrder(box); changed();
      });
      var up = el('button', { type: 'button', text: '↑', title: 'Move up', 'aria-label': 'Move ' + (LABELS[v] || v) + ' up', disabled: !on || i === 0, onclick: function () { set(path, move(chosen.slice(), i, -1)); renderOrder(box); changed(); } });
      var dn = el('button', { type: 'button', text: '↓', title: 'Move down', 'aria-label': 'Move ' + (LABELS[v] || v) + ' down', disabled: !on || i === chosen.length - 1, onclick: function () { set(path, move(chosen.slice(), i, 1)); renderOrder(box); changed(); } });
      var name = el('div', { class: 'n' }, [document.createTextNode(LABELS[v] || v), locked ? el('small', { text: on ? 'Skipped until the key is added' : '' }) : null]);
      box.appendChild(el('div', { class: 'item' + (on ? '' : ' off') + (locked ? ' locked' : '') }, [cb, name, locked ? needTag(need) : el('div', { class: 'ud' }, [up, dn])]));
    });
  }

  function fillInputs() {
    all('[data-k]').forEach(function (n) {
      var v = get(n.getAttribute('data-k'));
      if (n.type === 'checkbox') n.checked = !!v; else n.value = v == null ? '' : v;
    });
    all('[data-arr]').forEach(function (n) { n.checked = (get(n.getAttribute('data-arr')) || []).indexOf(n.value) >= 0; });
    all('[data-lines]').forEach(function (n) { n.value = (get(n.getAttribute('data-lines')) || []).join('\n'); });
    all('[data-ui]').forEach(function (n) { n.value = get(n.getAttribute('data-ui'), ui) || ''; });
    all('[data-order]').forEach(renderOrder);
    enhanceSelects();
    applyMode();
    refreshNeeds();
  }
  function bindInputs() {
    all('input[name="mode"]').forEach(function (n) {
      n.addEventListener('change', function () { cfg.advanced = n.value === 'advanced'; changed(); applyMode(); });
    });
    all('[data-k]').forEach(function (n) {
      n.addEventListener('input', function () {
        var v = n.type === 'checkbox' ? n.checked : n.type === 'number' ? Number(n.value) : n.value;
        set(n.getAttribute('data-k'), v); changed();
        if (n.getAttribute('data-k').indexOf('jellyfin.') === 0) renderInstall();
      });
    });
    all('[data-arr]').forEach(function (n) {
      n.addEventListener('change', function () {
        var path = n.getAttribute('data-arr');
        var order = all('[data-arr="' + path + '"]').map(function (x) { return x.value; });
        var cur = get(path) || [];
        if (n.checked && cur.indexOf(n.value) < 0) cur.push(n.value);
        if (!n.checked) cur = cur.filter(function (x) { return x !== n.value; });
        cur.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
        set(path, cur); changed();
      });
    });
    all('[data-lines]').forEach(function (n) {
      n.addEventListener('input', function () {
        set(n.getAttribute('data-lines'), n.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean)); changed();
      });
    });
    all('[data-ui]').forEach(function (n) {
      n.addEventListener('input', function () { set(n.getAttribute('data-ui'), n.value.trim(), ui); uiChanged(); });
    });
    $('show-keys').addEventListener('click', function () {
      var shown = this.textContent === 'Hide keys';
      all('input.key').forEach(function (i) { i.type = shown ? 'password' : 'text'; });
      this.textContent = shown ? 'Show keys' : 'Hide keys';
    });
  }

  var addonInfo = {}, removedAddon = null;
  var addonRoles = {catalog:'Catalogs',meta:'Metadata',stream:'Streams',subtitle:'Subtitles'};
  function addonEntries() {
    var entries = [];
    Object.keys(addonRoles).forEach(function(role) {
      (cfg.addons[role] || []).forEach(function(url) {
        var entry = entries.find(function(item) { return item.url === url; });
        if (!entry) { entry = {url:url,roles:[]}; entries.push(entry); }
        entry.roles.push(role);
      });
    });
    return entries;
  }
  function addonHost(url) { try { return new URL(url).hostname; } catch (_) { return 'Add-on'; } }
  function renderAddons() {
    var root = $('addon-list'), entries = addonEntries(); clear(root);
    $('addon-count').textContent = entries.length;
    $('addon-empty').hidden = entries.length > 0;
    entries.forEach(function(entry) {
      var info = addonInfo[entry.url] || {}, name = info.name || addonHost(entry.url);
      var badges = el('div',{class:'addon-badges'},entry.roles.map(function(role) { return el('span',{class:'pill',text:addonRoles[role]}); }));
      var result = el('p',{class:'status','role':'status'});
      var check = el('button',{type:'button',text:'Check','aria-label':'Check '+name,onclick:function() {
        check.disabled = true; result.textContent = 'Checking connection…';
        api('/api/probe',{url:entry.url}).then(function(r) {
          check.disabled = false;
          if (r.error) { result.textContent = r.error; return; }
          addonInfo[entry.url] = r; title.textContent = r.name || name;
          result.textContent = 'Connected' + (r.version ? ' · v'+r.version : '') + (r.catalogs ? ' · '+r.catalogs+' catalogs' : '');
        });
      }});
      var remove = el('button',{type:'button',class:'remove-addon',text:'Remove','aria-label':'Remove '+name,onclick:function() {
        removedAddon = {url:entry.url,roles:entry.roles.slice(),positions:entry.roles.map(function(role){return cfg.addons[role].indexOf(entry.url);})};
        entry.roles.forEach(function(role) { cfg.addons[role] = cfg.addons[role].filter(function(url) { return url !== entry.url; }); });
        renderAddons(); changed(); $('addon-removed').textContent = name+' removed.'; $('addon-undo-row').hidden = false; $('addon-undo').focus();
      }});
      var title = el('strong',{text:name});
      var identity = el('div',{class:'addon-identity'},[title,el('small',{text:addonHost(entry.url)}),badges]);
      var details = el('details',{class:'addon-details'},[el('summary',{text:'Manage roles'})]);
      var roles = el('div',{class:'checks'});
      Object.keys(addonRoles).forEach(function(role) {
        var cb=el('input',{type:'checkbox',checked:entry.roles.indexOf(role)>=0,'aria-label':addonRoles[role]+' for '+name});
        cb.addEventListener('change',function() {
          if (!cb.checked && entry.roles.length === 1) { cb.checked = true; result.textContent = 'Keep at least one role, or use Remove to disconnect this add-on.'; return; }
          if(cb.checked) { cfg.addons[role].push(entry.url); entry.roles.push(role); }
          else { cfg.addons[role]=cfg.addons[role].filter(function(url){return url!==entry.url;}); entry.roles=entry.roles.filter(function(r){return r!==role;}); }
          clear(badges); entry.roles.forEach(function(r){badges.appendChild(el('span',{class:'pill',text:addonRoles[r]}));}); result.textContent='Roles updated.'; changed();
        });
        roles.appendChild(el('label',{},[cb,addonRoles[role]]));
      });
      details.appendChild(roles);
      details.appendChild(el('label',{class:'addon-manifest'},[el('span',{text:'Manifest link'}),el('input',{type:'text',readonly:true,value:entry.url,'aria-label':'Manifest link for '+name})]));
      root.appendChild(el('article',{class:'addon-card'},[el('div',{class:'addon-card-main'},[el('span',{class:'addon-icon','aria-hidden':'true',text:name.charAt(0).toUpperCase()}),identity,el('div',{class:'b addon-actions'},[check,remove])]),details,result]));
    });
  }
  function bindAddons() {
    $('addon-form').addEventListener('submit',async function(e) {
      e.preventDefault();
      var urls=Array.from(new Set($('addon-url').value.split('\n').map(function(s){return s.trim().replace(/^stremio:\/\//i,'https://');}).filter(Boolean)));
      var kind=$('addon-kind').value, button=$('addon-submit'), status=$('addon-add-status');
      if(!urls.length) return;
      button.disabled=true; button.textContent='Adding…'; status.textContent='Checking manifest links…';
      var errors=[], added=0, unchanged=0;
      for(var url of urls) {
        try { var parsed=new URL(url); if(!['http:','https:'].includes(parsed.protocol)) throw new Error(); } catch (_) { errors.push('Use a valid http or https manifest link.'); continue; }
        var roles, info;
        if(kind==='auto') {
          info=await api('/api/probe',{url:url});
          if(info.error) { errors.push(addonHost(url)+': '+info.error); continue; }
          roles=Object.keys(addonRoles).filter(function(role){return (info.resources || []).includes(role === 'subtitle' ? 'subtitles' : role) || (role==='catalog' && info.catalogs>0);});
          if(!roles.length) { errors.push(addonHost(url)+': No supported roles found. Choose a role to add it manually.'); continue; }
          addonInfo[url]=info;
        } else roles=[kind];
        var didAdd=false;
        roles.forEach(function(role){if(cfg.addons[role].indexOf(url)<0){cfg.addons[role].push(url);didAdd=true;}});
        if(didAdd) added++; else unchanged++;
      }
      if(added) {renderAddons();changed();}
      if(!errors.length) $('addon-url').value='';
      status.textContent=[added ? added+' add-on'+(added===1?'':'s')+' added.' : '',unchanged ? unchanged+' already added.' : '',errors.join('\n')].filter(Boolean).join(' ');
      button.disabled=false; button.textContent='Add add-on';
    });
    $('addon-undo').addEventListener('click',function() {
      if(!removedAddon) return;
      removedAddon.roles.forEach(function(role,i){if(!cfg.addons[role].includes(removedAddon.url)) cfg.addons[role].splice(removedAddon.positions[i],0,removedAddon.url);});
      removedAddon=null;$('addon-undo-row').hidden=true;renderAddons();changed();$('addon-url').focus();
    });
  }

  var polls = {};
  function stopPoll(name) { if (polls[name]) { clearTimeout(polls[name]); polls[name] = null; } }
  function status(name, text, on) { var n = $(name + '-status'); n.textContent = text || ''; n.className = 'status' + (on ? ' on' : ''); }

  function renderTrackerStates() {
    var t = cfg.trackers;
    if (t.trakt && t.trakt.accessToken) {
      status('trakt', 'Connected' + (t.trakt.username ? ' as ' + t.trakt.username : '') + (t.trakt.expiresAt ? '. Token expires ' + when(t.trakt.expiresAt) + '.' : '.'), true);
      if (!ui.trakt.clientId && t.trakt.clientId) ui.trakt.clientId = t.trakt.clientId;
      if (!ui.trakt.clientSecret && t.trakt.clientSecret) ui.trakt.clientSecret = t.trakt.clientSecret;
    } else if (!polls.trakt) status('trakt', 'Not connected.');
    $('trakt-refresh').hidden = !(t.trakt && t.trakt.refreshToken);
    $('trakt-disconnect').hidden = !(t.trakt && t.trakt.accessToken);

    if (t.simkl && t.simkl.accessToken) {
      status('simkl', 'Connected. Simkl tokens do not expire.', true);
      if (!ui.simkl.clientId && t.simkl.clientId) ui.simkl.clientId = t.simkl.clientId;
    } else if (!polls.simkl) status('simkl', 'Not connected.');
    $('simkl-disconnect').hidden = !(t.simkl && t.simkl.accessToken);

    if (t.mal && t.mal.accessToken) {
      status('mal', 'Connected.' + (t.mal.expiresAt ? ' Token expires ' + when(t.mal.expiresAt) + '.' : ''), true);
      if (!ui.mal.clientId && t.mal.clientId) ui.mal.clientId = t.mal.clientId;
    } else status('mal', 'Not connected.');
    $('mal-disconnect').hidden = !(t.mal && t.mal.accessToken);

    if (t.anilist && t.anilist.accessToken) status('anilist', 'Connected. AniList tokens last about a year.', true);
    else status('anilist', 'Not connected.');
    $('anilist-disconnect').hidden = !(t.anilist && t.anilist.accessToken);

    all('[data-ui]').forEach(function (n) { n.value = get(n.getAttribute('data-ui'), ui) || ''; });
    renderAuthLinks();
  }

  function renderAuthLinks() {
    var a = $('anilist-link');
    if (ui.anilist.clientId) a.href = 'https://anilist.co/api/v2/oauth/authorize?client_id=' + encodeURIComponent(ui.anilist.clientId) + '&response_type=token';
    else a.removeAttribute('href');
    $('mal-open').disabled = !ui.mal.clientId;
  }

  $('trakt-connect').addEventListener('click', function () {
    var id = ui.trakt.clientId, secret = ui.trakt.clientSecret;
    if (!id || !secret) { status('trakt', 'Enter the client id and secret first.'); return; }
    stopPoll('trakt');
    status('trakt', 'Asking Trakt for a code…');
    api('/api/oauth/trakt/device', { clientId: id }).then(function (r) {
      if (r.error) { status('trakt', r.error); return; }
      $('trakt-code').hidden = false;
      $('trakt-usercode').textContent = r.userCode;
      $('trakt-verify').textContent = r.verificationUrl; $('trakt-verify').href = r.verificationUrl;
      var deadline = Date.now() + (r.expiresIn || 600) * 1000, wait = (r.interval || 5) * 1000;
      status('trakt', 'Waiting for you to approve on Trakt…');
      function tick() {
        if (Date.now() > deadline) { $('trakt-code').hidden = true; status('trakt', 'The code expired. Connect again.'); polls.trakt = null; return; }
        api('/api/oauth/trakt/token', { clientId: id, clientSecret: secret, deviceCode: r.deviceCode }).then(function (t) {
          if (t.pending) { if (t.slowDown) wait += 1000; polls.trakt = setTimeout(tick, wait); return; }
          polls.trakt = null;
          $('trakt-code').hidden = true;
          if (t.error) { status('trakt', t.error); return; }
          cfg.trackers.trakt = { clientId: id, clientSecret: secret, accessToken: t.accessToken, refreshToken: t.refreshToken, expiresAt: t.expiresAt, username: t.username };
          renderTrackerStates(); changed();
        });
      }
      polls.trakt = setTimeout(tick, wait);
    });
  });
  $('trakt-refresh').addEventListener('click', function () {
    var t = cfg.trackers.trakt; if (!t || !t.refreshToken) return;
    status('trakt', 'Refreshing…');
    api('/api/oauth/trakt/refresh', { clientId: ui.trakt.clientId || t.clientId, clientSecret: ui.trakt.clientSecret || t.clientSecret, refreshToken: t.refreshToken }).then(function (r) {
      if (r.error) { status('trakt', r.error); return; }
      t.accessToken = r.accessToken; t.refreshToken = r.refreshToken || t.refreshToken; t.expiresAt = r.expiresAt;
      renderTrackerStates(); changed();
    });
  });
  $('trakt-disconnect').addEventListener('click', function () { stopPoll('trakt'); delete cfg.trackers.trakt; $('trakt-code').hidden = true; dropTracker('trakt'); });

  $('simkl-connect').addEventListener('click', function () {
    var id = ui.simkl.clientId;
    if (!id) { status('simkl', 'Enter the client id first.'); return; }
    stopPoll('simkl');
    status('simkl', 'Asking Simkl for a PIN…');
    api('/api/oauth/simkl/pin', { clientId: id }).then(function (r) {
      if (r.error) { status('simkl', r.error); return; }
      $('simkl-code').hidden = false;
      $('simkl-usercode').textContent = r.userCode;
      $('simkl-verify').textContent = r.verificationUrl; $('simkl-verify').href = r.verificationUrl;
      var deadline = Date.now() + (r.expiresIn || 900) * 1000, wait = (r.interval || 5) * 1000;
      status('simkl', 'Waiting for you to enter the PIN on Simkl…');
      function tick() {
        if (Date.now() > deadline) { $('simkl-code').hidden = true; status('simkl', 'The PIN expired. Connect again.'); polls.simkl = null; return; }
        api('/api/oauth/simkl/poll', { clientId: id, userCode: r.userCode }).then(function (t) {
          if (t.pending) { if (t.slowDown) wait += 1000; polls.simkl = setTimeout(tick, wait); return; }
          polls.simkl = null;
          $('simkl-code').hidden = true;
          if (t.error) { status('simkl', t.error); return; }
          cfg.trackers.simkl = { clientId: id, accessToken: t.accessToken };
          renderTrackerStates(); changed();
        });
      }
      polls.simkl = setTimeout(tick, wait);
    });
  });
  $('simkl-disconnect').addEventListener('click', function () { stopPoll('simkl'); delete cfg.trackers.simkl; $('simkl-code').hidden = true; dropTracker('simkl'); });

  function malVerifier() {
    var bytes = new Uint8Array(64); crypto.getRandomValues(bytes);
    var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  $('mal-open').addEventListener('click', function () {
    var id = ui.mal.clientId; if (!id) return;
    var v = malVerifier(); ssSet('rill.mal.verifier', v);
    var url = 'https://myanimelist.net/v1/oauth2/authorize?response_type=code&client_id=' + encodeURIComponent(id) + '&code_challenge=' + v + '&code_challenge_method=plain';
    if (ui.mal.redirectUri) url += '&redirect_uri=' + encodeURIComponent(ui.mal.redirectUri);
    $('mal-url').textContent = url;
    status('mal', 'Approve on MyAnimeList, then paste the code from the address bar here.');
    window.open(url, '_blank', 'noopener');
  });
  $('mal-exchange').addEventListener('click', function () {
    var code = $('mal-code').value.trim(), v = ssGet('rill.mal.verifier');
    if (!code) { status('mal', 'Paste the code first.'); return; }
    if (!v) { status('mal', 'Open the authorisation page from this tab first; the verifier belongs to it.'); return; }
    try { if (code.indexOf('code=') >= 0) code = new URL(code).searchParams.get('code') || code; } catch (e) {}
    status('mal', 'Exchanging the code…');
    api('/api/oauth/mal/token', { clientId: ui.mal.clientId, code: code, verifier: v, redirectUri: ui.mal.redirectUri || undefined }).then(function (r) {
      if (r.error) { status('mal', r.error); return; }
      cfg.trackers.mal = { clientId: ui.mal.clientId, accessToken: r.accessToken, refreshToken: r.refreshToken, expiresAt: r.expiresAt };
      $('mal-code').value = ''; $('mal-url').textContent = '';
      renderTrackerStates(); changed();
    });
  });
  $('mal-disconnect').addEventListener('click', function () { delete cfg.trackers.mal; dropTracker('mal'); });

  $('anilist-save').addEventListener('click', function () {
    var tok = $('anilist-token').value.trim();
    try { if (tok.indexOf('access_token=') >= 0) tok = /access_token=([^&]+)/.exec(tok)[1]; } catch (e) {}
    if (!tok) { status('anilist', 'Paste the token first.'); return; }
    cfg.trackers.anilist = { accessToken: tok };
    $('anilist-token').value = '';
    renderTrackerStates(); changed();
  });
  $('anilist-disconnect').addEventListener('click', function () { delete cfg.trackers.anilist; dropTracker('anilist'); });

  function dropTracker(name) {
    if (cfg.trackers.primary === name) { cfg.trackers.primary = 'off'; $('tr-primary').value = 'off'; }
    cfg.trackers.scrobbleTo = cfg.trackers.scrobbleTo.filter(function (x) { return x !== name; });
    all('[data-arr="trackers.scrobbleTo"]').forEach(function (n) { n.checked = cfg.trackers.scrobbleTo.indexOf(n.value) >= 0; });
    renderTrackerStates(); changed();
  }

  function copyText(text, note) {
    function done(ok) { note.textContent = ok ? 'Copied' : 'Select and copy by hand'; setTimeout(function () { note.textContent = ''; }, 1800); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    else done(false);
  }
  all('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = $(b.getAttribute('data-copy')).textContent;
      if (!text) return;
      copyText(text, b.parentNode.querySelector('span'));
    });
  });
  $('load-btn').addEventListener('click', function () {
    var input = $('load-input').value.trim();
    if (!input) return;
    $('load-status').textContent = 'Reading…';
    api('/api/config/decode', { input: input }).then(function (r) {
      if (r.error || !r.config) { $('load-status').textContent = r.error || 'Could not read that.'; return; }
      Object.keys(polls).forEach(stopPoll);
      cfg = merge(DEFAULTS, r.config);
      $('load-input').value = '';
      $('load-status').textContent = 'Loaded. The form now shows that configuration.';
      lastCatKey = '';
      renderAll();
      changed();
    });
  });
  $('reset-btn').addEventListener('click', function () {
    if (!confirm('Replace the current draft with the defaults?')) return;
    Object.keys(polls).forEach(stopPoll);
    cfg = clone(DEFAULTS);
    lastCatKey = '';
    renderAll();
    changed();
  });

  async function deliveryStatus(retry) {
    var status=$('delivery-status');status.textContent='Checking…';
    var base=ORIGIN, access;
    try {
      var login=await fetch(base+'/Users/AuthenticateByName',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({Username:cfg.jellyfin.username,Pw:cfg.jellyfin.password})});
      var user=await login.json();if(!login.ok || !user.AccessToken)throw Error('Sign-in failed.');access=user.AccessToken;
      var headers={'x-emby-token':access};
      if(retry){var queued=await fetch(base+'/Tracking/Retry',{method:'POST',headers:headers});if(!queued.ok)throw Error('Could not queue retries.');}
      var result=await fetch(base+'/Tracking/Status',{headers:headers});if(!result.ok)throw Error('Could not read delivery status.');
      var state=await result.json();
      status.textContent=!state.durable ? 'Durable storage is not configured.' : state.failed ? state.failed+' failed; '+state.pending+' waiting. Reconnect the affected service, then retry.' : state.pending ? state.pending+' updates waiting for delivery.' : 'All queued updates delivered.';
      if(state.services && state.services.length)status.textContent+=' '+state.services.map(function(s){return s.service+': '+s.count+' '+s.status;}).join(' · ');
      $('delivery-retry').hidden=!state.failed;
    } catch(e){status.textContent=e.message || 'Could not check delivery status.';}
    finally {if(access)fetch(base+'/Sessions/Logout',{method:'POST',headers:{'x-emby-token':access}}).catch(function(){});}
  }
  $('delivery-check').addEventListener('click',function(){deliveryStatus(false);});
  $('delivery-retry').addEventListener('click',function(){deliveryStatus(true);});

  function renderProfiles() {
    var root = $('profiles'); clear(root);
    (cfg.jellyfin.profiles || []).forEach(function(p, index) {
      var box = el('div', {class:'svc'});
      function field(label, value, update, type) {
        var input=el('input',{type:type || 'text',value:value || '',onchange:function(){update(input.value);changed();}});
        return el('label',{class:'f'},[el('span',{class:'t',text:label}),input]);
      }
      box.appendChild(field('Name',p.name,function(v){p.name=v;}));
      var share=el('input',{type:'checkbox',checked:p.sharesHistory,onchange:function(){p.sharesHistory=share.checked;changed();}});
      box.appendChild(el('label',{class:'check'},[share,'Share account history and scrobbling']));
      box.appendChild(field('Avatar URL',p.avatar,function(v){p.avatar=v;},'url'));
      var cap=el('select',{onchange:function(){p.ageCap=cap.value;changed();}});
      $('agecap').querySelectorAll('option').forEach(function(o){cap.appendChild(o.cloneNode(true));});
      cap.options[0].textContent='Use account cap';
      cap.value=p.ageCap || '';
      box.appendChild(el('label',{class:'f'},[el('span',{class:'t',text:'Age cap'}),cap]));
      var catalogs=el('details',{},[el('summary',{text:'Catalogs'})]);
      catalogs.appendChild(el('p',{class:'note',text:'Leave all unchecked to show every enabled catalog.'}));
      cfg.catalogs.filter(function(c){return c.enabled;}).forEach(function(c){
        var input=el('input',{type:'checkbox',checked:(p.catalogs || []).indexOf(c.id)>=0,onchange:function(){p.catalogs=p.catalogs || [];p.catalogs=p.catalogs.filter(function(id){return id!==c.id;});if(input.checked)p.catalogs.push(c.id);changed();}});
        var def=catDefs.find(function(d){return d.id===c.id && d.type===c.type;});
        catalogs.appendChild(el('label',{class:'check'},[input,c.name || (def && def.name) || c.id]));
      });
      box.appendChild(catalogs);
      box.appendChild(el('button',{type:'button',text:'Remove profile',onclick:function(){cfg.jellyfin.profiles.splice(index,1);renderProfiles();changed();}}));
      root.appendChild(box);
    });
    enhanceSelects();
  }
  $('profile-add').addEventListener('click',function(){
    cfg.jellyfin.profiles=cfg.jellyfin.profiles || [];
    cfg.jellyfin.profiles.push({id:crypto.randomUUID(),name:'Viewer '+(cfg.jellyfin.profiles.length+1),sharesHistory:false,catalogs:[]});
    renderProfiles();changed();
  });

  var activePicker = null;
  var pickerId = 0;
  function closePicker(focus) {
    if (!activePicker) return;
    var picker = activePicker;
    activePicker = null;
    picker.menu.hidePopover();
    picker.trigger.setAttribute('aria-expanded', 'false');
    if (focus) picker.trigger.focus();
  }
  document.addEventListener('pointerdown', function(e) {
    if (activePicker && !activePicker.menu.contains(e.target) && !activePicker.trigger.contains(e.target)) closePicker(false);
  });
  window.addEventListener('resize', function() { closePicker(false); });
  window.addEventListener('hashchange', function() { closePicker(false); });
  document.addEventListener('scroll', function(e) {
    if (activePicker && !activePicker.menu.contains(e.target)) closePicker(false);
  }, true);

  function enhanceSelects() {
    if (!('showPopover' in HTMLElement.prototype)) return;
    all('select').forEach(function(select) {
      if (select._picker) { select._picker.sync(); return; }
      var label = Array.from(select.labels || []).map(function(l) { return (l.querySelector('.t') || l).textContent.trim(); }).join(' ') || select.getAttribute('aria-label') || 'Choose an option';
      var menu = el('div', {class:'select-menu',popover:'manual',role:'listbox',id:'picker-' + (++pickerId),'aria-label':label});
      var trigger = el('button', {type:'button',class:'select-trigger',role:'combobox','aria-label':label,'aria-haspopup':'listbox','aria-expanded':'false','aria-controls':menu.id});
      var wrapper = el('div', {class:'select-control'});
      select.parentNode.insertBefore(wrapper, select);
      wrapper.appendChild(select); wrapper.appendChild(trigger); wrapper.appendChild(menu);
      var picker = {menu:menu,trigger:trigger,sync:function() {
        trigger.textContent = select.selectedOptions[0] ? select.selectedOptions[0].textContent : 'Choose';
        trigger.disabled = select.disabled;
      }};
      select._picker = picker;
      function choose(index) {
        select.selectedIndex = index;
        picker.sync(); closePicker(true);
        select.dispatchEvent(new Event('input', {bubbles:true}));
        select.dispatchEvent(new Event('change', {bubbles:true}));
      }
      function open() {
        if (activePicker === picker) { closePicker(true); return; }
        closePicker(false); clear(menu);
        Array.from(select.options).forEach(function(option,index) {
          menu.appendChild(el('button', {type:'button',role:'option',tabindex:'-1',text:option.textContent,'aria-label':option.textContent,'aria-selected':String(option.selected),disabled:option.disabled,onclick:function() { choose(index); }}));
        });
        activePicker = picker;
        trigger.setAttribute('aria-expanded', 'true');
        var rect = trigger.getBoundingClientRect();
        var below = innerHeight - rect.bottom - 12;
        var above = rect.top - 12;
        var height = Math.min(280, Math.max(below, above));
        menu.style.width = Math.min(rect.width, innerWidth - 24) + 'px';
        menu.style.maxHeight = height + 'px';
        menu.style.left = Math.max(12, Math.min(rect.left, innerWidth - rect.width - 12)) + 'px';
        menu.style.top = below >= Math.min(280, select.options.length * 40 + 14) || below >= above ? (rect.bottom + 6) + 'px' : 'auto';
        menu.style.bottom = menu.style.top === 'auto' ? (innerHeight - rect.top + 6) + 'px' : 'auto';
        menu.showPopover();
        var selected = menu.querySelector('[aria-selected=true]:not(:disabled)') || menu.querySelector('[role=option]:not(:disabled)');
        if (selected) { selected.focus({preventScroll:true}); selected.scrollIntoView({block:'nearest'}); }
      }
      trigger.addEventListener('click', open);
      trigger.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); }
      });
      var search = '', searchTimer;
      menu.addEventListener('keydown', function(e) {
        var choices = all('[role=option]:not(:disabled)', menu);
        var index = choices.indexOf(document.activeElement);
        var next = e.key === 'ArrowDown' ? (index + 1) % choices.length : e.key === 'ArrowUp' ? (index + choices.length - 1) % choices.length : e.key === 'Home' ? 0 : e.key === 'End' ? choices.length - 1 : -1;
        if (next >= 0) { e.preventDefault(); choices[next].focus(); }
        else if (e.key === 'Escape') { e.preventDefault(); closePicker(true); }
        else if (e.key === 'Tab') { closePicker(true); }
        else if (e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault(); search += e.key.toLowerCase(); clearTimeout(searchTimer);
          searchTimer = setTimeout(function() { search = ''; }, 600);
          var match = choices.find(function(choice) { return choice.textContent.toLowerCase().startsWith(search); });
          if (match) match.focus();
        }
      });
      select.addEventListener('change', picker.sync);
      picker.sync();
    });
  }

  function renderAll() {
    updateSummary();
    fillInputs();
    renderTrackerStates();
    renderAddons();
    renderCatalogs();
    renderProfiles();
    renderCustomCatalogs();
    renderCollections();
    enhanceSelects();
    renderInstall();
  }
  bindInputs();
  bindAddons();
  renderAll();
  encode();
  loadCatalogs();
  api('/api/account/status').then(function (r) {
    account = { durable: !!r.durable, exists: !!r.exists, signedIn: !!r.signedIn, username: r.username || '' };
    renderAccount();
    if (account.signedIn) api('/api/account/load').then(function (l) { if (!l.error) adoptServerConfig(l.config); });
  });
})();
`;

export function renderPage(): string {
  const defaults = JSON.stringify(DEFAULT_CONFIG).replace(/</g, '\\u003c');
  const script = JS.replace('__DEFAULTS__', defaults);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="referrer" content="no-referrer">
<title>Rill</title>
<link rel="icon" href="/favicon.svg?v=${BRAND_VERSION}" type="image/svg+xml">
<style>${CSS}</style>
</head>
<body>
${body()}
<script>${script}</script>
</body>
</html>`;
}

export function renderLogo(): string {
  return BRAND_LOGO;
}
