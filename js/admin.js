/* ═══════════════════════════════════════════════
   MERYNE STUDIO — Admin Panel
   Visible uniquement si role = 'admin'
   ═══════════════════════════════════════════════ */

async function renderAdmin() {
  if (!window._IS_ADMIN) return;

  var container = document.getElementById('tab-admin');
  if (!container) return;

  container.innerHTML = ''
    + '<div style="max-width:620px;margin:0 auto;padding:16px 16px 80px;">'
    + '<div style="font-size:13px;font-weight:800;color:var(--ink);margin-bottom:4px;">Interface Administrateur</div>'
    + '<div style="font-size:11px;color:var(--muted);margin-bottom:16px;">Connecté en tant que ' + escapeHtml(window._USER_EMAIL || '') + '</div>'
    + '<div id="admin-content"><div style="text-align:center;padding:40px;color:var(--muted);font-size:12px;">Chargement…</div></div>'
    + '</div>';

  var profiles = await _adminLoadProfiles();
  _renderAdminContent(profiles);
}

async function _adminLoadProfiles() {
  if (!sb) return null;
  try {
    var { data, error } = await sb
      .from('profiles')
      .select('id, email, display_name, role, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    return null;
  }
}

function _renderAdminContent(profiles) {
  var c = document.getElementById('admin-content');
  if (!c) return;

  var html = '';

  // ─── Créer un compte ───
  html += '<div style="background:#fff;border:1.5px solid var(--bord);border-radius:12px;padding:16px;margin-bottom:12px;">'
    + '<div style="font-size:12px;font-weight:800;color:var(--ink);margin-bottom:12px;">Créer un compte utilisateur</div>'
    + '<div style="margin-bottom:8px;">'
    + '<label style="display:block;font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px;">Email</label>'
    + '<input type="email" id="adm-email" placeholder="utilisateur@exemple.com" style="width:100%;padding:9px 12px;border:1.5px solid var(--bord);border-radius:9px;font-family:\'DM Sans\',sans-serif;font-size:13px;outline:none;">'
    + '</div>'
    + '<div style="margin-bottom:8px;">'
    + '<label style="display:block;font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px;">Mot de passe</label>'
    + '<input type="password" id="adm-pass" placeholder="••••••••" style="width:100%;padding:9px 12px;border:1.5px solid var(--bord);border-radius:9px;font-family:\'DM Sans\',sans-serif;font-size:13px;outline:none;">'
    + '</div>'
    + '<div style="margin-bottom:12px;">'
    + '<label style="display:block;font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px;">Nom affiché</label>'
    + '<input type="text" id="adm-name" placeholder="Prénom ou pseudo" style="width:100%;padding:9px 12px;border:1.5px solid var(--bord);border-radius:9px;font-family:\'DM Sans\',sans-serif;font-size:13px;outline:none;">'
    + '</div>'
    + '<div style="font-size:10px;color:var(--muted);background:var(--surf);border-radius:8px;padding:8px 10px;margin-bottom:10px;">'
    + 'Un email de confirmation sera envoyé si activé dans Supabase. '
    + 'Pour désactiver : Supabase dashboard → Auth → Email confirmations → OFF'
    + '</div>'
    + '<div style="display:flex;justify-content:flex-end;">'
    + '<button onclick="adminCreateUser()" style="padding:9px 18px;background:var(--rose);color:#fff;border:none;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:\'DM Sans\',sans-serif;">Créer le compte</button>'
    + '</div>'
    + '</div>';

  // ─── Liste utilisateurs ───
  html += '<div style="background:#fff;border:1.5px solid var(--bord);border-radius:12px;padding:16px;margin-bottom:12px;">'
    + '<div style="font-size:12px;font-weight:800;color:var(--ink);margin-bottom:12px;">Utilisateurs</div>';

  if (profiles === null) {
    // Table profiles manquante
    html += '<div style="background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.25);border-radius:8px;padding:14px;font-size:12px;">'
      + '<strong style="color:var(--amber);display:block;margin-bottom:8px;">Table "profiles" introuvable</strong>'
      + 'Exécute ce SQL dans ton dashboard Supabase (SQL Editor) :'
      + '<pre style="background:#F3F4F6;border-radius:8px;padding:12px;font-size:10px;line-height:1.8;overflow-x:auto;margin-top:10px;white-space:pre;">'
      + 'create table profiles (\n'
      + '  id           uuid references auth.users primary key,\n'
      + '  email        text,\n'
      + '  display_name text,\n'
      + '  role         text default \'user\',\n'
      + '  created_at   timestamptz default now()\n'
      + ');\n\n'
      + 'alter table profiles enable row level security;\n\n'
      + '-- Chaque utilisateur voit son propre profil\n'
      + 'create policy "own_profile" on profiles\n'
      + '  for all using (auth.uid() = id);\n\n'
      + '-- L\'admin voit tous les profils\n'
      + 'create policy "admin_sees_all" on profiles\n'
      + '  for select using (\n'
      + '    exists (\n'
      + '      select 1 from profiles\n'
      + '      where id = auth.uid() and role = \'admin\'\n'
      + '    )\n'
      + '  );\n\n'
      + '-- Définir le premier admin (remplace l\'UUID)\n'
      + 'update profiles set role = \'admin\' where email = \'ton@email.com\';'
      + '</pre>'
      + '</div>';
  } else if (profiles.length === 0) {
    html += '<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px;">Aucun utilisateur</div>';
  } else {
    html += '<div style="overflow-x:auto;">'
      + '<table style="width:100%;border-collapse:collapse;">'
      + '<thead><tr>'
      + '<th style="text-align:left;font-size:9px;font-weight:700;color:var(--muted);padding:6px 8px;border-bottom:1.5px solid var(--bord);text-transform:uppercase;letter-spacing:.5px;">Email</th>'
      + '<th style="text-align:left;font-size:9px;font-weight:700;color:var(--muted);padding:6px 8px;border-bottom:1.5px solid var(--bord);text-transform:uppercase;letter-spacing:.5px;">Nom</th>'
      + '<th style="text-align:left;font-size:9px;font-weight:700;color:var(--muted);padding:6px 8px;border-bottom:1.5px solid var(--bord);text-transform:uppercase;letter-spacing:.5px;">Rôle</th>'
      + '<th style="text-align:left;font-size:9px;font-weight:700;color:var(--muted);padding:6px 8px;border-bottom:1.5px solid var(--bord);text-transform:uppercase;letter-spacing:.5px;">Inscrit le</th>'
      + '</tr></thead><tbody>';

    profiles.forEach(function (p) {
      var isMe = p.id === window._MERYNE_UID;
      var roleStyle = p.role === 'admin'
        ? 'background:rgba(124,58,237,.1);color:#7C3AED;'
        : 'background:rgba(107,114,128,.1);color:#6B7280;';
      var date = p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

      html += '<tr style="' + (isMe ? 'background:rgba(255,45,122,.03);' : '') + '">'
        + '<td style="font-size:12px;padding:9px 8px;border-bottom:1px solid var(--bord);">'
        + escapeHtml(p.email || '—')
        + (isMe ? ' <span style="font-size:9px;color:var(--rose);font-weight:700;background:rgba(255,45,122,.08);padding:1px 6px;border-radius:20px;">vous</span>' : '')
        + '</td>'
        + '<td style="font-size:12px;padding:9px 8px;border-bottom:1px solid var(--bord);color:var(--muted);">' + escapeHtml(p.display_name || '—') + '</td>'
        + '<td style="padding:9px 8px;border-bottom:1px solid var(--bord);">'
        + '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;' + roleStyle + '">' + escapeHtml(p.role || 'user') + '</span>'
        + '</td>'
        + '<td style="font-size:11px;padding:9px 8px;border-bottom:1px solid var(--bord);color:var(--muted);">' + date + '</td>'
        + '</tr>';
    });

    html += '</tbody></table></div>'
      + '<div style="font-size:10px;color:var(--muted);margin-top:10px;">'
      + 'Pour promouvoir un utilisateur en admin : Supabase → Table Editor → profiles → modifier le champ role.'
      + '</div>';
  }

  html += '</div>';

  c.innerHTML = html;
}

async function adminCreateUser() {
  var emailEl = document.getElementById('adm-email');
  var passEl  = document.getElementById('adm-pass');
  var nameEl  = document.getElementById('adm-name');

  var email = emailEl ? emailEl.value.trim() : '';
  var pass  = passEl  ? passEl.value : '';
  var name  = nameEl  ? nameEl.value.trim() : '';

  if (!email) { showSync('⚠️ Email requis', 'rgba(245,158,11,.8)'); return; }
  if (pass.length < 6) { showSync('⚠️ Mot de passe : 6 caractères minimum', 'rgba(245,158,11,.8)'); return; }
  if (!sb) return;

  var btn = document.querySelector('[onclick="adminCreateUser()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Création…'; }

  var result = await sb.auth.signUp({
    email: email,
    password: pass,
    options: { data: { display_name: name } }
  });

  if (btn) { btn.disabled = false; btn.textContent = 'Créer le compte'; }

  if (result.error) {
    showSync('❌ ' + result.error.message, 'rgba(220,38,38,.8)');
    return;
  }

  // Créer le profil manuellement (au cas où le trigger n'existe pas)
  if (result.data && result.data.user) {
    try {
      await sb.from('profiles').insert({
        id:           result.data.user.id,
        email:        email,
        display_name: name,
        role:         'user'
      });
    } catch (e) {}
  }

  showSync('✅ Compte créé !', 'rgba(5,150,105,.8)');
  if (emailEl) emailEl.value = '';
  if (passEl)  passEl.value  = '';
  if (nameEl)  nameEl.value  = '';

  var profiles = await _adminLoadProfiles();
  _renderAdminContent(profiles);
}
