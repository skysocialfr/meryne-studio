/* ═══════════════════════════════════════════════
   MERYNE STUDIO V4 — Storage (Supabase + localStorage)
   ═══════════════════════════════════════════════ */

const SUPA_URL = 'https://uqyprtitkuqkdrrzckbc.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxeXBydGl0a3Vxa2Rycnpja2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNzUwNzUsImV4cCI6MjA4ODk1MTA3NX0.6SWZcRcctqMecI6VIsO3gwdGopiadcMP-W5HD66fo0c';

let sb = null;

function initSupabase() {
  if (typeof supabase !== 'undefined' && SUPA_URL) {
    sb = supabase.createClient(SUPA_URL, SUPA_KEY);
    return true;
  }
  return false;
}

// ─── Get current user ID for multi-user data isolation ───
function getCurrentUserId() {
  if (sb && sb.auth) {
    var session = null;
    // Use cached session from auth module
    if (window._currentSession && window._currentSession.user) {
      return window._currentSession.user.id;
    }
  }
  return 'default';
}

// ─── Cloud Save (with user isolation) ───
async function cloudSave(key, data) {
  var userId = getCurrentUserId();
  var storageKey = userId !== 'default' ? userId + ':' + key : key;

  // Always save to localStorage as backup
  try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch(e) {}

  // If Supabase configured, sync to cloud
  if (!sb) return;
  try {
    await sb.from('studio_data').upsert({
      key: storageKey,
      data: data,
      user_id: userId,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
    showSync('Saved', null);
  } catch(e) {
    showSync('Local only', 'rgba(245,158,11,.8)');
  }
}

// ─── Cloud Load (with user isolation + legacy migration) ───
async function cloudLoad(key, fallback) {
  var userId = getCurrentUserId();
  var storageKey = userId !== 'default' ? userId + ':' + key : key;

  // Try Supabase first (with user prefix)
  if (sb) {
    try {
      var res = await sb.from('studio_data').select('data').eq('key', storageKey).single();
      if (res.data && res.data.data !== undefined) {
        try { localStorage.setItem(storageKey, JSON.stringify(res.data.data)); } catch(e) {}
        return res.data.data;
      }
    } catch(e) {}

    // Try Supabase with legacy key (no user prefix) — migration path
    if (userId !== 'default') {
      try {
        var legacyRes = await sb.from('studio_data').select('data').eq('key', key).single();
        if (legacyRes.data && legacyRes.data.data !== undefined) {
          try { localStorage.setItem(storageKey, JSON.stringify(legacyRes.data.data)); } catch(e) {}
          return legacyRes.data.data;
        }
      } catch(e) {}
    }
  }

  // Fallback to localStorage (try new key format first, then legacy)
  try {
    var r = localStorage.getItem(storageKey);
    if (r) return JSON.parse(r);
    // Try legacy key (without user prefix) for migration
    if (userId !== 'default') {
      var legacy = localStorage.getItem(key);
      if (legacy) return JSON.parse(legacy);
    }
  } catch(e) {}

  return fallback;
}
