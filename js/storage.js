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

// ─── Cloud Load : localStorage en priorité, INSTANTANÉ ───
async function cloudLoad(key, fallback) {
  var sk = _sk(key);

  // 1. localStorage avec clé UUID (priorité)
  try {
    var local = localStorage.getItem(sk);
    if (local !== null) return JSON.parse(local);
  } catch(e) {}

  // 1b. localStorage sans préfixe (fallback legacy)
  try {
    var local2 = localStorage.getItem(key);
    if (local2 !== null) return JSON.parse(local2);
  } catch(e) {}

  // 2. Supabase avec clé UUID (timeout 3s)
  if (sb) {
    try {
      var timeout = new Promise(function(res) { setTimeout(function(){ res(null); }, 3000); });
      var query = sb.from('studio_data').select('data').eq('key', sk).single();
      var result = await Promise.race([query, timeout]);
      if (result && result.data && result.data.data !== undefined) {
        try { localStorage.setItem(sk, JSON.stringify(result.data.data)); } catch(e) {}
        return result.data.data;
      }
    } catch(e) {}

    // 2b. Supabase clé sans préfixe (legacy, timeout 3s)
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
  }, 30000); // 30 secondes de délai
}

// ─── Cloud Save : localStorage immédiat + Supabase debounced ───
async function cloudSave(key, data) {
  var sk = _sk(key);

  // localStorage immédiat (toujours)
  try { localStorage.setItem(sk, JSON.stringify(data)); } catch(e) {}
  showSync('Saved', null);

  // Supabase en arrière-plan avec debounce (ne pas surcharger la DB)
  if (!sb) return;
  _syncQueue[sk] = data;
  _scheduleSupa();
}
