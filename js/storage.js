/* ═══════════════════════════════════════════════
   MERYNE STUDIO — Storage (localStorage prioritaire + Supabase optionnel)
   ═══════════════════════════════════════════════ */

const SUPA_URL = 'https://uqyprtitkuqkdrrzckbc.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxeXBydGl0a3Vxa2Rycnpja2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNzUwNzUsImV4cCI6MjA4ODk1MTA3NX0.6SWZcRcctqMecI6VIsO3gwdGopiadcMP-W5HD66fo0c';

var sb = null;

function initSupabase() {
  if (typeof supabase !== 'undefined' && SUPA_URL) {
    try { sb = supabase.createClient(SUPA_URL, SUPA_KEY); return true; } catch(e) {}
  }
  return false;
}

// ─── Timeout helper ───
function _sbTimeout(ms) {
  return new Promise(function(resolve) { setTimeout(function() { resolve(null); }, ms); });
}

// ─── Clé de stockage (toujours "default" car auth locale) ───
function _storageKey(key) { return key; }

// ─── Cloud Save ───
async function cloudSave(key, data) {
  var sk = _storageKey(key);

  // Sauvegarde localStorage en priorité (toujours)
  try { localStorage.setItem(sk, JSON.stringify(data)); } catch(e) {}

  // Supabase en arrière-plan si disponible (avec timeout 4s)
  if (!sb) return;
  try {
    var savePromise = sb.from('studio_data').upsert({
      key: sk, data: data, updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
    var result = await Promise.race([savePromise, _sbTimeout(4000)]);
    if (result && !result.error) showSync('Saved', null);
    else showSync('Local only', 'rgba(245,158,11,.8)');
  } catch(e) {
    showSync('Local only', 'rgba(245,158,11,.8)');
  }
}

// ─── Cloud Load ───
async function cloudLoad(key, fallback) {
  var sk = _storageKey(key);

  // 1. localStorage d'abord (instantané)
  try {
    var local = localStorage.getItem(sk);
    if (local) return JSON.parse(local);
  } catch(e) {}

  // 2. Supabase si localStorage vide (avec timeout 4s)
  if (sb) {
    try {
      var loadPromise = sb.from('studio_data').select('data').eq('key', sk).single();
      var res = await Promise.race([loadPromise, _sbTimeout(4000)]);
      if (res && res.data && res.data.data !== undefined) {
        try { localStorage.setItem(sk, JSON.stringify(res.data.data)); } catch(e) {}
        return res.data.data;
      }
    } catch(e) {}

    // Tentative clé legacy (ancien format avec préfixe userId)
    try {
      var keys = await _sbTimeout(0); // ne bloque pas
      var legacyPromise = sb.from('studio_data').select('key,data').like('key', '%:' + key).limit(1);
      var legacyRes = await Promise.race([legacyPromise, _sbTimeout(4000)]);
      if (legacyRes && legacyRes.data && legacyRes.data.length > 0) {
        var d = legacyRes.data[0].data;
        try { localStorage.setItem(sk, JSON.stringify(d)); } catch(e) {}
        return d;
      }
    } catch(e) {}
  }

  return fallback;
}
