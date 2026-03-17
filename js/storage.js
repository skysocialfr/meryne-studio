/* ═══════════════════════════════════════════════
   MERYNE STUDIO — Storage v6
   Sync intelligent : timestamps pour toujours
   garder la donnée la plus récente (PC ou tel)
   ═══════════════════════════════════════════════ */

const SUPA_URL = 'https://uqyprtitkuqkdrrzckbc.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxeXBydGl0a3Vxa2Rycnpja2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNzUwNzUsImV4cCI6MjA4ODk1MTA3NX0.6SWZcRcctqMecI6VIsO3gwdGopiadcMP-W5HD66fo0c';

var sb = null;

function initSupabase() {
  if (typeof supabase !== 'undefined' && SUPA_URL) {
    try { sb = supabase.createClient(SUPA_URL, SUPA_KEY); } catch(e) { sb = null; }
  }
}

// ─── Clé de stockage (avec préfixe UUID si disponible) ───
function _sk(key) {
  return window._MERYNE_UID ? window._MERYNE_UID + ':' + key : key;
}

// ─── Cloud Load : timestamp-based sync (toujours la donnée la plus récente) ───
async function cloudLoad(key, fallback) {
  var sk = _sk(key);

  // 1. Récupérer localStorage + son timestamp
  var localData = null;
  var localTs = 0;
  try {
    var raw = localStorage.getItem(sk);
    if (raw !== null) {
      localData = JSON.parse(raw);
      localTs = parseInt(localStorage.getItem(sk + '_ts') || '0');
    }
  } catch(e) {}

  // 2. Essayer Supabase (clé UUID-préfixée)
  if (sb) {
    try {
      var ms = (key === 'feeddata2' || key === 'ig_posts') ? 12000 : 6000;
      var timeout = new Promise(function(res) { setTimeout(function(){ res(null); }, ms); });
      var query = sb.from('studio_data').select('data,updated_at').eq('key', sk).single();
      var result = await Promise.race([query, timeout]);
      if (result && result.data && result.data.data !== undefined) {
        var sbTs = result.data.updated_at ? new Date(result.data.updated_at).getTime() : 0;
        // Utiliser la donnée la plus récente
        if (sbTs >= localTs) {
          // Supabase est plus récent → mettre à jour localStorage
          try {
            localStorage.setItem(sk, JSON.stringify(result.data.data));
            localStorage.setItem(sk + '_ts', sbTs.toString());
          } catch(e) {}
          return result.data.data;
        } else {
          // localStorage est plus récent → garder local (et re-sauvegarder sur Supabase en background)
          if (localData !== null) {
            _sbResync(sk, localData);
            return localData;
          }
        }
      }
    } catch(e) {}
  }

  // 3. localStorage si Supabase indisponible
  if (localData !== null) return localData;

  // 4. Clé legacy (sans préfixe UUID) — uniquement si rien d'autre trouvé
  if (sb && window._MERYNE_UID) {
    try {
      var timeout3 = new Promise(function(res) { setTimeout(function(){ res(null); }, 3000); });
      var query3 = sb.from('studio_data').select('data').eq('key', key).single();
      var result3 = await Promise.race([query3, timeout3]);
      if (result3 && result3.data && result3.data.data !== undefined) {
        // NE PAS écraser localStorage avec des données legacy
        return result3.data.data;
      }
    } catch(e) {}
  }

  return fallback;
}

// Resync silencieux : repousse les données locales vers Supabase
function _sbResync(sk, data) {
  if (!sb) return;
  setTimeout(function() {
    sb.from('studio_data').upsert({
      key: sk, data: data, updated_at: new Date().toISOString()
    }, { onConflict: 'key' }).then(function() {}).catch(function() {});
  }, 1000);
}

// ─── Cloud Save : localStorage (avec timestamp) + Supabase ───
async function cloudSave(key, data) {
  var sk = _sk(key);
  var ts = Date.now();

  // 1. localStorage immédiat avec timestamp
  try {
    localStorage.setItem(sk, JSON.stringify(data));
    localStorage.setItem(sk + '_ts', ts.toString());
  } catch(e) {}

  // 2. Supabase (sync multi-appareils)
  if (!sb) { showSync('Saved', null); return; }
  try {
    var res = await sb.from('studio_data').upsert({
      key: sk,
      data: data,
      updated_at: new Date(ts).toISOString()
    }, { onConflict: 'key' });
    if (res && res.error) showSync('Local only ⚠️', 'rgba(245,158,11,.8)');
    else showSync('Saved ☁️', null);
  } catch(e) {
    showSync('Local only ⚠️', 'rgba(245,158,11,.8)');
  }
}
