/* ═══════════════════════════════════════════════
   VEYRA STUDIO — PWA install
   Register a tiny shell service worker so the platform-native install
   prompt becomes available, then surface an "Install l'app" CTA in the
   Settings menu when the browser tells us we can prompt.

   iOS Safari ignores beforeinstallprompt, so we also show a one-time
   in-app hint on first visit ("Ajoute à l'écran d'accueil") with the
   share-sheet path.
   ═══════════════════════════════════════════════ */

var _PWA_PROMPT = null;

(function () {
  // Service worker registration (silently fails on insecure contexts / dev)
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () { /* ignore */ });
    });
  }

  // Standard install prompt (Chrome, Edge, Android, etc.)
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    _PWA_PROMPT = e;
    _showInstallEntry(true);
  });

  // After install, hide the CTA
  window.addEventListener('appinstalled', function () {
    _PWA_PROMPT = null;
    _showInstallEntry(false);
    if (typeof showSync === 'function') showSync('✅ Veyra installé', 'rgba(5,150,105,.8)');
  });

  // iOS hint — show once per device, only when standalone isn't already on
  document.addEventListener('DOMContentLoaded', function () {
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    var inStandalone = window.navigator.standalone === true
      || window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !inStandalone && !localStorage.getItem('veyra_ios_install_seen')) {
      // Wait until the user is past landing / onboarding
      setTimeout(function () {
        if (document.getElementById('app') && document.getElementById('app').style.display !== 'none') {
          _showIosInstallHint();
        }
      }, 4000);
    }
  });
})();

// Toggles the "Installer l'app" row in the Settings menu (added dynamically
// so the menu has no clutter for non-installable contexts).
function _showInstallEntry(show) {
  var menu = document.getElementById('settings-menu');
  var existing = document.getElementById('settings-install-row');
  if (!menu) return;
  if (!show) {
    if (existing) existing.remove();
    return;
  }
  if (existing) return;
  var row = document.createElement('button');
  row.id = 'settings-install-row';
  row.className = 'settings-row';
  row.onclick = installVeyra;
  row.innerHTML = '<span class="settings-row-ic">📲</span><span class="settings-row-label">Installer l\'app</span>'
    + '<span class="settings-row-extra st-active">Nouveau</span>';
  // Insert near the top (after user name)
  var firstRow = menu.querySelector('.settings-row');
  if (firstRow) menu.insertBefore(row, firstRow);
  else menu.appendChild(row);
}

async function installVeyra() {
  if (!_PWA_PROMPT) return;
  closeSettingsMenu && closeSettingsMenu();
  _PWA_PROMPT.prompt();
  try {
    var choice = await _PWA_PROMPT.userChoice;
    if (typeof track === 'function') track('pwa_install_' + (choice && choice.outcome));
  } catch (e) {}
  _PWA_PROMPT = null;
  _showInstallEntry(false);
}

function _showIosInstallHint() {
  localStorage.setItem('veyra_ios_install_seen', '1');
  var hint = document.createElement('div');
  hint.className = 'ios-install-toast';
  hint.innerHTML = '<div class="iit-row">'
    + '<div class="iit-ic">📲</div>'
    + '<div class="iit-body">'
    +   '<strong>Installe Veyra sur ton écran d\'accueil</strong>'
    +   '<span>Touche <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="vertical-align:-3px;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> puis "Sur l\'écran d\'accueil".</span>'
    + '</div>'
    + '<button class="iit-close" onclick="this.parentNode.parentNode.remove()" aria-label="Fermer">&times;</button>'
    + '</div>';
  document.body.appendChild(hint);
  // Auto-dismiss after 12s
  setTimeout(function () { if (hint && hint.parentNode) hint.remove(); }, 12000);
}
