// ═══ Données : Supabase (posts, abonnés, médias, notifications) ═══
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPA_URL, SUPA_KEY, VAPID_PUBLIC_KEY, BUCKET } from './config.js';

export const DEMO = new URLSearchParams(location.search).has('demo');
export const sb = DEMO
  ? await (await import('./demo.js')).makeDemoSb()
  : createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

export const S = {
  user: null,
  profile: null,
  posts: [],
  followers: [],
  listeners: new Set(),
};
export const onChange = (fn) => S.listeners.add(fn);
const emit = () => S.listeners.forEach((fn) => fn());

// ─── Chargement ───
export async function loadAll() {
  const uid = S.user.id;
  const [p, f, pr] = await Promise.all([
    sb.from('vs_posts').select('*').order('scheduled_at', { ascending: true, nullsFirst: false }),
    sb.from('vs_followers').select('*').order('day', { ascending: true }),
    sb.from('vs_profiles').select('*').eq('user_id', uid).maybeSingle(),
  ]);
  if (p.error) throw p.error;
  S.posts = p.data || [];
  S.followers = f.data || [];
  S.profile = pr.data || (await saveProfile({}));
  await Promise.all([warmThumbs(S.posts), S.profile.avatar_path && signedUrls([S.profile.avatar_path])]);
  emit();
}

// ─── Profil ───
export async function saveProfile(patch) {
  const row = { user_id: S.user.id, ...(S.profile || {}), ...patch, updated_at: new Date().toISOString() };
  const { data, error } = await sb.from('vs_profiles').upsert(row).select().single();
  if (error) throw error;
  S.profile = data;
  emit();
  return data;
}

// ─── Posts ───
export const newId = () => crypto.randomUUID();
export const getPost = (id) => S.posts.find((p) => p.id === id);

export async function savePost(post) {
  const row = { ...post, user_id: S.user.id };
  delete row.created_at; delete row.updated_at;
  const { data, error } = await sb.from('vs_posts').upsert(row).select().single();
  if (error) throw error;
  const i = S.posts.findIndex((p) => p.id === data.id);
  if (i >= 0) S.posts[i] = data; else S.posts.push(data);
  sortPosts();
  await warmThumbs([data]);
  emit();
  return data;
}

export async function patchPost(id, patch) {
  const { data, error } = await sb.from('vs_posts').update(patch).eq('id', id).select().single();
  if (error) throw error;
  const i = S.posts.findIndex((p) => p.id === id);
  if (i >= 0) S.posts[i] = data;
  sortPosts();
  emit();
  return data;
}

export async function deletePost(post) {
  const paths = mediaPaths(post);
  const { error } = await sb.from('vs_posts').delete().eq('id', post.id);
  if (error) throw error;
  if (paths.length) await sb.storage.from(BUCKET).remove(paths);
  S.posts = S.posts.filter((p) => p.id !== post.id);
  emit();
}

function sortPosts() {
  S.posts.sort((a, b) => (a.scheduled_at ? new Date(a.scheduled_at) : Infinity) - (b.scheduled_at ? new Date(b.scheduled_at) : Infinity));
}
export const mediaPaths = (post) => (post.media || []).flatMap((m) => [m.path, m.thumb]).filter(Boolean);

// ─── Abonnés ───
export async function logFollowers(platform, count, day = new Date()) {
  const d = new Date(day); const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const { data, error } = await sb.from('vs_followers')
    .upsert({ user_id: S.user.id, platform, day: iso, count }, { onConflict: 'user_id,platform,day' })
    .select().single();
  if (error) throw error;
  S.followers = S.followers.filter((f) => !(f.platform === platform && f.day === iso)).concat(data)
    .sort((a, b) => a.day.localeCompare(b.day));
  emit();
}
export const latestFollowers = (platform) => [...S.followers].reverse().find((f) => f.platform === platform)?.count;

// ─── Médias ───
const urlCache = new Map(); // path -> { url, exp }
export const cachedUrl = (path) => { const c = urlCache.get(path); return c && c.exp > Date.now() ? c.url : null; };

export async function signedUrls(paths) {
  const need = [...new Set(paths.filter((p) => p && !cachedUrl(p)))];
  if (need.length) {
    const { data } = await sb.storage.from(BUCKET).createSignedUrls(need, 3600 * 6);
    (data || []).forEach((d) => d.signedUrl && urlCache.set(d.path, { url: d.signedUrl, exp: Date.now() + 3600 * 5 * 1000 }));
  }
  return paths.map(cachedUrl);
}
export const warmThumbs = (posts) => signedUrls(posts.flatMap((p) => [p.cover_path, p.media?.[0]?.thumb || p.media?.[0]?.path]).filter(Boolean));
export function thumbOf(post) {
  const path = post.cover_path || post.media?.[0]?.thumb || (post.media?.[0]?.type === 'image' ? post.media[0].path : null);
  return path ? cachedUrl(path) : null;
}

/** Envoie un fichier dans le stockage avec suivi de progression (0 → 1). */
export async function uploadFile(path, blob, onProgress) {
  if (DEMO) { for (let x = 0.2; x <= 1; x += 0.2) { onProgress?.(x); await new Promise((r) => setTimeout(r, 150)); } sb._put(path, blob); return path; }
  const { data: { session } } = await sb.auth.getSession();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${SUPA_URL}/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`);
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    xhr.setRequestHeader('apikey', SUPA_KEY);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.setRequestHeader('Content-Type', blob.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => (xhr.status < 300 ? resolve(path) : reject(new Error(parseErr(xhr))));
    xhr.onerror = () => reject(new Error('Connexion perdue pendant l’envoi'));
    xhr.send(blob);
  });
}
function parseErr(xhr) {
  try { const j = JSON.parse(xhr.responseText); if (/maximum allowed size|too large/i.test(j.message || j.error || '')) return 'Fichier trop lourd pour ton stockage (limite 50 Mo sur l’offre gratuite)'; return j.message || j.error; } catch { return `Erreur ${xhr.status}`; }
}

export async function removeFiles(paths) { if (paths.length) await sb.storage.from(BUCKET).remove(paths); }

/** Télécharge les fichiers d'un post pour pouvoir les enregistrer / partager. */
export async function fetchMediaFiles(post, onProgress) {
  const files = [];
  const list = post.media || [];
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    const { data, error } = await sb.storage.from(BUCKET).download(m.path);
    if (error) throw error;
    const ext = (m.path.split('.').pop() || (m.type === 'video' ? 'mp4' : 'jpg')).toLowerCase();
    const base = (post.title || 'post').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'post';
    files.push(new File([data], `${base}-${i + 1}.${ext}`, { type: data.type || m.mime || (m.type === 'video' ? 'video/mp4' : 'image/jpeg') }));
    onProgress?.((i + 1) / list.length);
  }
  return files;
}

// ─── Miniatures (générées dans le navigateur) ───
export async function makeThumb(file) {
  const W = 540;
  const draw = (src, w, h) => {
    const c = document.createElement('canvas');
    c.width = W; c.height = Math.round((h / w) * W);
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    return new Promise((r) => c.toBlob((b) => r({ blob: b, w, h }), 'image/jpeg', 0.8));
  };
  if (file.type.startsWith('image/')) {
    const bmp = await createImageBitmap(file).catch(() => null);
    return bmp ? draw(bmp, bmp.width, bmp.height) : null;
  }
  if (file.type.startsWith('video/')) {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      const url = URL.createObjectURL(file);
      const done = (r) => { URL.revokeObjectURL(url); resolve(r); };
      const t = setTimeout(() => done(null), 8000);
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
      v.onloadeddata = () => { v.currentTime = Math.min(0.8, (v.duration || 1) / 3); };
      v.onseeked = async () => { clearTimeout(t); const r = await draw(v, v.videoWidth, v.videoHeight); done({ ...r, dur: v.duration }); };
      v.onerror = () => { clearTimeout(t); done(null); };
      v.load();
    });
  }
  return null;
}

// ─── Notifications push ───
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function currentPushSub() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function enablePush() {
  if (DEMO) throw new Error('Pas de notifications en mode démo');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications refusées. Active-les dans les réglages de ton téléphone.');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: b64ToBytes(VAPID_PUBLIC_KEY),
  });
  const j = sub.toJSON();
  const { error } = await sb.from('vs_push_subscriptions').upsert({
    user_id: S.user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent.slice(0, 200),
  }, { onConflict: 'endpoint' });
  if (error) throw error;
  return sub;
}

export async function disablePush() {
  const sub = await currentPushSub();
  if (!sub) return;
  await sb.from('vs_push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

function b64ToBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
