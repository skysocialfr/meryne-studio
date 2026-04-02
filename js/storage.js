/* ═══════════════════════════════════════════════
   MERYNE STUDIO — Storage v7
   Supabase initialisé immédiatement (multi-user)
   ═══════════════════════════════════════════════ */

const SUPA_URL = 'https://uqyprtitkuqkdrrzckbc.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxeXBydGl0a3Vxa2Rycnpja2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNzUwNzUsImV4cCI6MjA4ODk1MTA3NX0.6SWZcRcctqMecI6VIsO3gwdGopiadcMP-W5HD66fo0c';

// Initialisation immédiate (avant auth.js)
var sb = null;
(function () {
  try {
    if (typeof supabase !== 'undefined') {
      sb = supabase.createClient(SUPA_URL, SUPA_KEY);
    }
  } catch (e) { sb = null; }
})();

// Conservé pour compatibilité — ne fait plus rien
function initSupabase() {}

// ─── Clé de stockage (préfixée par UUID utilisateur) ───
function _sk(key) {
  return window._MERYNE_UID ? window._MERYNE_UID + ':' + key : key;
}

// ─── Cloud Load : timestamp-based sync ───
async function cloudLoad(key, fallback) {
  var sk = _sk(key);

  var localData = null;
  var localTs = 0;
  try {
    var raw = localStorage.getItem(sk);
    if (raw !== null) {
      localData = JSON.parse(raw);
      localTs = parseInt(localStorage.getItem(sk + '_ts') || '0');
    }
  } catch (e) {}

  if (sb) {
    try {
      var ms = (key === 'feeddata2' || key === 'ig_posts') ? 12000 : 6000;
      var timeout = new Promise(function (res) { setTimeout(function () { res(null); }, ms); });
      var query = sb.from('studio_data').select('data,updated_at').eq('key', sk).single();
      var result = await Promise.race([query, timeout]);
      if (result && result.data && result.data.data !== undefined) {
        var sbTs = result.data.updated_at ? new Date(result.data.updated_at).getTime() : 0;
        if (sbTs >= localTs) {
          try {
            localStorage.setItem(sk, JSON.stringify(result.data.data));
            localStorage.setItem(sk + '_ts', sbTs.toString());
          } catch (e) {}
          return result.data.data;
        } else {
          if (localData !== null) {
            _sbResync(sk, localData);
            return localData;
          }
        }
      }
    } catch (e) {}
  }

  if (localData !== null) return localData;

  // Clé legacy (sans préfixe UUID)
  if (sb && window._MERYNE_UID) {
    try {
      var timeout3 = new Promise(function (res) { setTimeout(function () { res(null); }, 3000); });
      var query3 = sb.from('studio_data').select('data').eq('key', key).single();
      var result3 = await Promise.race([query3, timeout3]);
      if (result3 && result3.data && result3.data.data !== undefined) {
        return result3.data.data;
      }
    } catch (e) {}
  }

  return fallback;
}

function _sbResync(sk, data) {
  if (!sb) return;
  setTimeout(function () {
    sb.from('studio_data').upsert({
      key: sk, data: data, updated_at: new Date().toISOString()
    }, { onConflict: 'key' }).then(function () {}).catch(function () {});
  }, 1000);
}

// ─── Cloud Save ───
async function cloudSave(key, data) {
  var sk = _sk(key);
  var ts = Date.now();
  try {
    localStorage.setItem(sk, JSON.stringify(data));
    localStorage.setItem(sk + '_ts', ts.toString());
  } catch (e) {}

  if (!sb) { showSync('Saved', null); return; }
  try {
    var res = await sb.from('studio_data').upsert({
      key: sk,
      data: data,
      updated_at: new Date(ts).toISOString()
    }, { onConflict: 'key' });
    if (res && res.error) showSync('Local only ⚠️', 'rgba(245,158,11,.8)');
    else showSync('Saved ☁️', null);
  } catch (e) {
    showSync('Local only ⚠️', 'rgba(245,158,11,.8)');
  }
}
