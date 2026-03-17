/* ═══════════════════════════════════════════════
   MERYNE STUDIO — Storage
   Priorité : localStorage (instantané)
   Supabase : sync en arrière-plan uniquement
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

// ─── Cloud Load : compare timestamps localStorage vs Supabase ───
async function cloudLoad(key, fallback) {
  var sk = _sk(key);

  // Lire localStorage (données + timestamp)
  var localData = null;
  var localTs = 0;
  try {
    var local = localStorage.getItem(sk);
    if (local !== null) {
      localData = JSON.parse(local);
      localTs = parseInt(localStorage.getItem(sk + ':ts') || '0');
    }
  } catch(e) {}

  // Fallback legacy (sans préfixe UUID)
  if (localData === null) {
    try {
      var local2 = localStorage.getItem(key);
      if (local2 !== null) { localData = JSON.parse(local2); localTs = 0; }
    } catch(e) {}
  }

  // Supabase : vérifier si plus récent (timeout 4s)
  if (sb) {
    try {
      var timeout = new Promise(function(res) { setTimeout(function(){ res(null); }, 4000); });
      var query = sb.from('studio_data').select('data,updated_at').eq('key', sk).single();
      var result = await Promise.race([query, timeout]);
      if (result && result.data && result.data.data !== undefined) {
        var sbTs = result.data.updated_at ? new Date(result.data.updated_at).getTime() : 0;
        if (sbTs > localTs) {
          // Supabase est plus récent → mettre à jour localStorage
          try {
            localStorage.setItem(sk, JSON.stringify(result.data.data));
            localStorage.setItem(sk + ':ts', sbTs.toString());
          } catch(e) {}
          return result.data.data;
        }
      }
    } catch(e) {}

    // Legacy clé sans préfixe
    if (localData === null) {
      try {
        var timeout2 = new Promise(function(res) { setTimeout(function(){ res(null); }, 3000); });
        var query2 = sb.from('studio_data').select('data').eq('key', key).single();
        var result2 = await Promise.race([query2, timeout2]);
        if (result2 && result2.data && result2.data.data !== undefined) {
          try { localStorage.setItem(sk, JSON.stringify(result2.data.data)); } catch(e) {}
          return result2.data.data;
        }
      } catch(e) {}
    }
  }

  if (localData !== null) return localData;
  return fallback;
}

// ─── Debounce Supabase : max 1 sync toutes les 30s ───
var _syncQueue = {};
var _syncTimer = null;
function _scheduleSupa() {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(function() {
    if (!sb) return;
    var queue = _syncQueue;
    _syncQueue = {};
    Object.keys(queue).forEach(function(sk) {
      try {
        sb.from('studio_data').upsert({
          key: sk,
          data: queue[sk],
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' }).then(function(r) {
          if (!r || r.error) showSync('Local only', 'rgba(245,158,11,.8)');
          else showSync('Saved ☁️', null);
        }).catch(function() { showSync('Local only', 'rgba(245,158,11,.8)'); });
      } catch(e) {}
    });
  }, 10000); // 10 secondes de délai
}

// ─── Cloud Save : localStorage immédiat + Supabase debounced ───
async function cloudSave(key, data) {
  var sk = _sk(key);

  // localStorage immédiat (toujours) avec timestamp
  var now = Date.now();
  try {
    localStorage.setItem(sk, JSON.stringify(data));
    localStorage.setItem(sk + ':ts', now.toString());
  } catch(e) {}
  showSync('Saved', null);

  // Supabase en arrière-plan avec debounce (ne pas surcharger la DB)
  if (!sb) return;
  _syncQueue[sk] = data;
  _scheduleSupa();
}
