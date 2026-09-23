// ═══ Mode démo (?demo) : faux Supabase en mémoire, avec des posts d'exemple ═══
// Sert à essayer l'app sans compte et sans rien enregistrer.

const USER = { id: '00000000-0000-4000-8000-000000000001', email: 'demo@veyrastudio.fr' };
const files = new Map(); // path -> { blob, url }

function put(path, blob) {
  const old = files.get(path); if (old) URL.revokeObjectURL(old.url);
  files.set(path, { blob, url: URL.createObjectURL(blob) });
}

class Query {
  constructor(db, table) { Object.assign(this, { db, table, op: 'select', filters: [], one: false, payload: null, conflict: null }); }
  select() { return this; }
  order() { return this; }
  eq(c, v) { this.filters.push((r) => r[c] === v); return this; }
  in(c, vs) { this.filters.push((r) => vs.includes(r[c])); return this; }
  is() { return this; } neq() { return this; } not() { return this; } lte() { return this; } gte() { return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; return this; }
  upsert(row, o) { this.op = 'upsert'; this.payload = row; this.conflict = o?.onConflict; return this; }
  update(p) { this.op = 'update'; this.payload = p; return this; }
  delete() { this.op = 'delete'; return this; }
  then(ok, ko) { return new Promise((r) => setTimeout(r, 120)).then(() => this.run()).then(ok, ko); }
  run() {
    const rows = (this.db[this.table] ||= []);
    const match = (r) => this.filters.every((f) => f(r));
    let out;
    if (this.op === 'select') out = rows.filter(match);
    if (this.op === 'delete') { this.db[this.table] = rows.filter((r) => !match(r)); out = []; }
    if (this.op === 'update') { out = rows.filter(match).map((r) => Object.assign(r, this.payload, { updated_at: new Date().toISOString() })); }
    if (this.op === 'upsert') {
      const keys = this.conflict ? this.conflict.split(',') : this.table === 'vs_profiles' ? ['user_id'] : ['id'];
      const hit = rows.find((r) => keys.every((k) => r[k] === this.payload[k]));
      const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...hit, ...this.payload, updated_at: new Date().toISOString() };
      if (hit) Object.assign(hit, row); else rows.push(row);
      out = [hit || row];
    }
    out = structuredClone(out);
    return { data: this.one ? out[0] ?? null : out, error: null };
  }
}

export async function makeDemoSb() {
  const db = await seed();
  let authCb = null;
  return {
    demo: true,
    _put: put,
    from: (t) => new Query(db, t),
    auth: {
      onAuthStateChange(cb) { authCb = cb; setTimeout(() => cb('SIGNED_IN', { user: USER }), 0); return { data: { subscription: { unsubscribe() {} } } }; },
      getSession: async () => ({ data: { session: { user: USER, access_token: 'demo' } } }),
      signOut: async () => { location.href = location.pathname; },
      signInWithPassword: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({}),
      updateUser: async () => ({}),
    },
    storage: {
      from: () => ({
        createSignedUrls: async (paths) => ({ data: paths.map((p) => ({ path: p, signedUrl: files.get(p)?.url || null })) }),
        remove: async (paths) => { paths.forEach((p) => files.delete(p)); return {}; },
        download: async (p) => (files.get(p) ? { data: files.get(p).blob } : { error: new Error('Fichier introuvable') }),
        copy: async (a, b) => { const f = files.get(a); if (f) put(b, f.blob); return {}; },
      }),
    },
  };
}

// ─── Données d'exemple ───
const PALETTES = [['#F9C5D1', '#9B5DE5'], ['#FFE5B4', '#FF6F91'], ['#C1F0E6', '#3A86FF'], ['#FFD6E0', '#C9184A'], ['#EDE7FF', '#7C3AED'], ['#FDE2C9', '#E76F51'], ['#D8F3DC', '#2D6A4F'], ['#E0E7FF', '#3F37C9'], ['#FFF1C1', '#F77F00']];

async function art(label, i, w = 1080, h = 1440) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const [a, b] = PALETTES[i % PALETTES.length];
  const grad = g.createLinearGradient(0, 0, w, h); grad.addColorStop(0, a); grad.addColorStop(1, b);
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.25)';
  g.beginPath(); g.arc(w * 0.72, h * 0.3, w * 0.28, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.font = `700 ${w * 0.085}px "DM Sans", sans-serif`; g.textAlign = 'center';
  label.split('\n').forEach((l, k) => g.fillText(l, w / 2, h * 0.62 + k * w * 0.1));
  return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
}

async function seed() {
  const now = new Date();
  const at = (d, h, m = 0) => { const x = new Date(now); x.setDate(x.getDate() + d); x.setHours(h, m, 0, 0); return x.toISOString(); };
  const soon = new Date(now.getTime() + 25 * 60_000).toISOString();
  const specs = [
    { platform: 'tiktok', format: 'video', title: 'GRWM soirée entre copines', when: soon, status: 'ready', caption: 'On se prépare ensemble pour ce soir ✨ Dis-moi en commentaire ta routine préférée !', hashtags: '#grwm #makeup #soiree #beauty', script: { hook: '« Je n’ai que 10 minutes pour me préparer… »', shots: [{ text: 'Face cam, cheveux mouillés, je lance le chrono' }, { text: 'Teint : gros plan fond de teint + blush' }, { text: 'Tenue : transition claquement de doigts' }, { text: 'Résultat final, tour sur moi-même' }], cta: 'Abonne-toi pour la partie 2 (le retour de soirée 😂)', sound: 'Son tendance « Espresso »' } },
    { platform: 'instagram', format: 'carousel', title: 'Mes 5 indispensables d’automne', when: at(0, 18), status: 'ready', caption: 'Mes 5 indispensables pour l’automne 🍂 Lequel tu adoptes ?', hashtags: '#automne #ootd #favoris', first_comment: 'Tous les liens sont dans ma story à la une « Favoris » 💌', n: 3 },
    { platform: 'tiktok', format: 'video', title: 'Storytime : mon pire date', when: at(1, 12, 30), status: 'draft', caption: '', hashtags: '#storytime', script: { hook: 'Il est arrivé avec 45 minutes de retard… et sa mère.', shots: [{ text: 'Face cam, assise sur le lit' }] } },
    { platform: 'instagram', format: 'reel', title: 'Routine du matin 6h', when: at(2, 7), status: 'draft', caption: 'Ma routine du matin pour être productive (sans me lever à 5h)', hashtags: '#morningroutine #productivite' },
    { platform: 'instagram', format: 'post', title: 'Photo plage Biarritz', when: at(4, 19), status: 'ready', caption: 'Dernier coucher de soleil de la saison 🌅', hashtags: '#biarritz #sunset' },
    { platform: 'tiktok', format: 'photos', title: 'Dump de septembre', when: at(5, 20), status: 'idea', caption: '' },
    { platform: 'tiktok', format: 'video', title: 'Tuto coiffure 3 min', when: null, status: 'idea' },
    { platform: 'instagram', format: 'reel', title: 'Unboxing colis Sézane', when: null, status: 'idea' },
    { platform: 'instagram', format: 'reel', title: 'Vlog week-end Lisbonne', pub: -2, stats: { views: 48200, likes: 3900, comments: 212, shares: 340, saves: 1250 } },
    { platform: 'instagram', format: 'carousel', title: 'Outfits de la semaine', pub: -5, stats: { views: 21800, likes: 2100, comments: 96, shares: 80, saves: 640 }, n: 2 },
    { platform: 'tiktok', format: 'video', title: 'POV : premier jour au bureau', pub: -1, stats: {} },
    { platform: 'tiktok', format: 'video', title: 'Get ready with me (lundi)', pub: -3, stats: { views: 132000, likes: 15400, comments: 680, shares: 2100, saves: 3900 } },
    { platform: 'tiktok', format: 'video', title: 'Ce que je mange en une journée', pub: -8, stats: { views: 64000, likes: 5200, comments: 310, shares: 420, saves: 980 } },
    { platform: 'instagram', format: 'post', title: 'Café du dimanche', pub: -9, stats: { views: 9800, likes: 1100, comments: 45, shares: 12, saves: 90 } },
    { platform: 'instagram', format: 'reel', title: 'Haul Zara automne', pub: -12, stats: { views: 35500, likes: 2800, comments: 150, shares: 210, saves: 900 } },
    { platform: 'tiktok', format: 'video', title: 'Réponse à vos questions', pub: -15, stats: { views: 22000, likes: 1900, comments: 420, shares: 60, saves: 150 } },
  ];
  const posts = [];
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    const id = crypto.randomUUID();
    const media = [];
    const hasMedia = !(s.status === 'idea' && !s.n);
    for (let k = 0; hasMedia && k < (s.n || 1); k++) {
      const blob = await art(`${s.title.split(' ').slice(0, 3).join(' ')}${s.n ? `\n${k + 1}/${s.n}` : ''}`, i + k);
      const path = `${USER.id}/${id}/${k}.jpg`;
      put(path, blob);
      media.push({ path, thumb: path, type: 'image', mime: 'image/jpeg', name: `${k}.jpg`, size: blob.size });
    }
    const pubAt = s.pub != null ? at(s.pub, 18) : null;
    posts.push({
      id, user_id: USER.id, platform: s.platform, format: s.format, title: s.title, caption: s.caption || '', hashtags: s.hashtags || '',
      first_comment: s.first_comment || '', script: s.script || {}, media, cover_path: null,
      scheduled_at: s.when !== undefined ? s.when : pubAt, status: s.pub != null ? 'published' : s.status,
      published_at: pubAt, post_url: null, stats: s.stats || {}, notified_at: null, created_at: now.toISOString(), updated_at: now.toISOString(),
    });
  }
  const followers = [];
  for (let d = 42; d >= 0; d -= 3) {
    const day = new Date(now); day.setDate(day.getDate() - d);
    const iso = day.toISOString().slice(0, 10);
    followers.push({ id: crypto.randomUUID(), user_id: USER.id, platform: 'instagram', day: iso, count: Math.round(8200 + (42 - d) * 38 + Math.sin(d) * 40) });
    followers.push({ id: crypto.randomUUID(), user_id: USER.id, platform: 'tiktok', day: iso, count: Math.round(3100 + (42 - d) ** 1.6 * 9) });
  }
  return {
    vs_posts: posts,
    vs_followers: followers,
    vs_profiles: [{ user_id: USER.id, display_name: 'Meryne', ig_handle: '@meryne', tt_handle: '@meryne', ig_bio: 'Lifestyle · mode · beauté ✨\nParis 📍', tt_bio: 'Ma vie en vidéos 🎬', avatar_path: null, reminder_minutes: 0 }],
    vs_push_subscriptions: [],
  };
}
