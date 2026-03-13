/* ═══════════════════════════════════════════════
   MERYNE STUDIO V4 — Utilities
   ═══════════════════════════════════════════════ */

// ─── XSS Protection ───
function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ─── Confirm Dialog ───
function askConfirm(msg, onYes) {
  var existing = document.getElementById('cfrm-overlay');
  if (existing) existing.remove();
  var el = document.createElement('div');
  el.id = 'cfrm-overlay';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  var box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:16px;padding:24px;max-width:320px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);';
  box.innerHTML = '<div style="font-size:15px;font-weight:700;color:#18181B;margin-bottom:8px;">Confirmation</div>'
    + '<div style="font-size:13px;color:#6B7280;margin-bottom:20px;">' + escapeHtml(msg) + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;">'
    + '<button class="cfrm-no" style="padding:8px 16px;border-radius:8px;border:1.5px solid #E5E7EB;background:#F9FAFB;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Annuler</button>'
    + '<button class="cfrm-yes" style="padding:8px 16px;border-radius:8px;border:none;background:#EF4444;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Supprimer</button>'
    + '</div>';
  el.appendChild(box);
  document.body.appendChild(el);
  box.querySelector('.cfrm-no').onclick = function() { el.remove(); };
  box.querySelector('.cfrm-yes').onclick = function() { el.remove(); onYes(); };
}

// ─── Modal System ───
function openModal(html) {
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ─── Sync Indicator ───
function showSync(msg, color) {
  var el = document.getElementById('sync-indicator');
  if (!el) return;
  el.textContent = msg;
  el.style.background = color || 'rgba(5,150,105,.12)';
  el.style.color = color ? '#fff' : '#059669';
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(function(){ el.style.opacity = '0'; }, 2500);
}
