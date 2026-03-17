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

// ─── Cloud Load : localStorage en priorité, INSTANTANÉ ───
async function cloudLoad(key, fallback) {
  // 1. localStorage (instantané, toujours en premier)
  try {
    var local = localStorage.getItem(key);
    if (local !== null) return JSON.parse(local);
  } catch(e) {}

  // 2. Supabase uniquement si localStorage vide (avec timeout court 3s)
  if (sb) {
    try {
      var timeout = new Promise(function(res) { setTimeout(function(){ res(null); }, 3000); });
      var query = sb.from('studio_data').select('data').eq('key', key).single();
      var result = await Promise.race([query, timeout]);
      if (result && result.data && result.data.data !== undefined) {
        // Copie en localStorage pour les prochaines fois
        try { localStorage.setItem(key, JSON.stringify(result.data.data)); } catch(e) {}
        return result.data.data;
      }
    } catch(e) {}
  }

  return fallback;
}

// ─── Cloud Save : localStorage immédiat + Supabase en arrière-plan ───
async function cloudSave(key, data) {
  // localStorage immédiat (toujours)
  try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}

  // Supabase en arrière-plan (fire & forget, ne bloque pas l'UI)
  if (!sb) return;
  try {
    sb.from('studio_data').upsert({
      key: key,
      data: data,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' }).then(function(r) {
      if (!r || r.error) showSync('Local only', 'rgba(245,158,11,.8)');
      else showSync('Saved', null);
    }).catch(function() {
      showSync('Local only', 'rgba(245,158,11,.8)');
    });
  } catch(e) {
    showSync('Local only', 'rgba(245,158,11,.8)');
  }
}
