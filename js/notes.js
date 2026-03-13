/* ═══════════════════════════════════════════════
   MERYNE STUDIO V4 — Notes Rapides
   ═══════════════════════════════════════════════ */

var NOTES = [];
var _notesOpen = false;
var _noteDebounceTimers = {};

function toggleNotesPanel() {
  _notesOpen = !_notesOpen;
  var panel = document.getElementById('notes-panel');
  if (!panel) return;
  if (_notesOpen) {
    panel.classList.add('open');
    renderNotes();
  } else {
    panel.classList.remove('open');
  }
}

function renderNotes() {
  var list = document.getElementById('notes-list');
  if (!list) return;

  if (!NOTES.length) {
    list.innerHTML = '<div style="text-align:center;padding:24px 16px;color:var(--muted);font-size:12px;">Aucune note<br><span style="font-size:11px">Clique sur + pour commencer</span></div>';
    return;
  }

  list.innerHTML = NOTES.map(function(n) {
    return '<div class="note-item" id="note-' + n.id + '">'
      + '<textarea oninput="updateNote(\'' + n.id + '\', this.value)" placeholder="\xC9cris ta note...">' + escapeHtml(n.text) + '</textarea>'
      + '<div class="note-item-footer">'
      + '<span class="note-date">' + escapeHtml(n.date) + '</span>'
      + '<button class="note-del-btn" onclick="deleteNote(\'' + n.id + '\')">&#x1F5D1;</button>'
      + '</div>'
      + '</div>';
  }).join('');
}

function addNote() {
  var now = new Date();
  var d = ('0' + now.getDate()).slice(-2) + '/' + ('0' + (now.getMonth() + 1)).slice(-2) + '/' + now.getFullYear();
  var t = ('0' + now.getHours()).slice(-2) + 'h' + ('0' + now.getMinutes()).slice(-2);
  NOTES.unshift({ id: 'note' + Date.now(), text: '', date: d + ' à ' + t });
  save();
  renderNotes();
  // Focus the new textarea
  setTimeout(function() {
    var ta = document.querySelector('#notes-list .note-item:first-child .note-ta');
    if (ta) ta.focus();
  }, 50);
}

function updateNote(id, text) {
  if (_noteDebounceTimers[id]) clearTimeout(_noteDebounceTimers[id]);
  _noteDebounceTimers[id] = setTimeout(function() {
    var n = NOTES.find(function(x) { return x.id === id; });
    if (n) { n.text = text; save(); }
  }, 500);
}

function deleteNote(id) {
  askConfirm('Supprimer cette note ?', function() {
    NOTES = NOTES.filter(function(x) { return x.id !== id; });
    save();
    renderNotes();
  });
}
