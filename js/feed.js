/* ═══════════════════════════════════════════════
   MERYNE STUDIO V4 — Feed Module
   Instagram + TikTok feed grid with drag & drop
   ═══════════════════════════════════════════════ */

// ─── Feed State ───
var FEED_DATA = { insta: [], tiktok: [] };
var feedPlat = 'insta';
var feedEditIdx = null;
var dragSrcIdx = null;
var dragSrcPlat = null;

// ─── IG Profile State ───
var IG_PROFILE = { handle: 'meryne.eis', bio: '', avatar: null, followers: null };
var IG_HIGHLIGHTS = [];
var IG_STORIES = [];
var _storyIdx = 0;
var _storyTimer = null;

// ═══════════════════════════════════════════════
//  Data Persistence
// ═══════════════════════════════════════════════

async function loadFeedData() {
  var loaded = await cloudLoad('feeddata2', { insta: [], tiktok: [] });
  FEED_DATA = loaded;
  if (!FEED_DATA.insta) FEED_DATA.insta = [];
  if (!FEED_DATA.tiktok) FEED_DATA.tiktok = [];
}

function saveFeedData() {
  cloudSave('feeddata2', FEED_DATA);
}

// ═══════════════════════════════════════════════
//  Image Compression
// ═══════════════════════════════════════════════

function compressImage(dataUrl, cb) {
  var img = new Image();
  img.onload = function() {
    var maxSize = 600;
    var w = img.width;
    var h = img.height;
    if (w > maxSize || h > maxSize) {
      if (w > h) {
        h = Math.round(h * maxSize / w);
        w = maxSize;
      } else {
        w = Math.round(w * maxSize / h);
        h = maxSize;
      }
    }
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    var compressed = canvas.toDataURL('image/jpeg', 0.65);
    cb(compressed);
  };
  img.onerror = function() {
    cb(dataUrl);
  };
  img.src = dataUrl;
}

// ═══════════════════════════════════════════════
//  Feed Switching & Count
// ═══════════════════════════════════════════════

function switchFeed(plat, btn) {
  feedPlat = plat;
  document.querySelectorAll('.ig-feed-tab').forEach(function(b) {
    b.classList.remove('active');
  });
  if (btn) btn.classList.add('active');

  var instaWrap = document.getElementById('feed-insta-wrap');
  var tiktokWrap = document.getElementById('feed-tiktok-wrap');

  if (instaWrap) instaWrap.style.display = plat === 'insta' ? '' : 'none';
  if (tiktokWrap) tiktokWrap.style.display = plat === 'tiktok' ? '' : 'none';
}

function updateFeedCount() {
  var el = document.getElementById('ig-post-count');
  if (el) el.textContent = FEED_DATA.insta.length;
}

// ═══════════════════════════════════════════════
//  Feed Rendering
// ═══════════════════════════════════════════════

async function renderFeed() {
  await loadFeedData();
  renderFeedGrid('insta');
  renderFeedGrid('tiktok');
  updateFeedCount();
  renderHighlights();
}

function renderFeedGrid(plat) {
  var container = document.getElementById('feed-' + plat);
  if (!container) return;

  var posts = FEED_DATA[plat] || [];
  var html = '';

  // Render existing posts
  for (var i = 0; i < posts.length; i++) {
    var p = posts[i];
    var mediaHtml = '';

    var firstMedia = (p.photos && p.photos.length > 0) ? p.photos[0] : p.media;
    var photoCount = (p.photos && p.photos.length > 1) ? p.photos.length : 0;
    var isVideoFmt = p.format && ['Reel', 'TikTok', 'Short', 'IGTV'].indexOf(p.format) !== -1;
    if (isVideoFmt && p.cover) {
      mediaHtml = '<img draggable="false" src="' + p.cover + '" style="width:100%;height:100%;object-fit:cover;pointer-events:none;" alt="">';
    } else if (firstMedia && firstMedia.indexOf('data:video') === 0) {
      mediaHtml = '<video src="' + firstMedia + '" style="width:100%;height:100%;object-fit:cover;pointer-events:none;" muted></video>';
    } else if (firstMedia && firstMedia.indexOf('data:') === 0) {
      mediaHtml = '<img draggable="false" src="' + firstMedia + '" style="width:100%;height:100%;object-fit:cover;pointer-events:none;" alt="">';
    } else if (p.emoji) {
      mediaHtml = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:48px;background:#F3F4F6;">' + escapeHtml(p.emoji) + '</div>';
    } else {
      mediaHtml = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#F3F4F6;color:#D1D5DB;font-size:32px;"><svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>';
    }

    var doneColor = p.done ? '#10B981' : '#D1D5DB';
    var overlayTitle = p.title ? escapeHtml(p.title) : '';
    var overlayDate = p.date ? escapeHtml(p.date) : '';
    var overlayFormat = p.format ? escapeHtml(p.format) : '';

    html += '<div class="feed-cell" draggable="true"'
      + ' ondragstart="feedDragStart(event,' + i + ',\'' + plat + '\')"'
      + ' ondragover="feedDragOver(event)"'
      + ' ondrop="feedDrop(event,' + i + ',\'' + plat + '\')"'
      + ' ondragend="feedDragEnd(event)"'
      + ' onclick="openFeedModal(' + i + ',\'' + plat + '\')"'
      + ' style="position:relative;aspect-ratio:1;border-radius:8px;overflow:hidden;cursor:grab;border:1.5px solid #E5E7EB;background:#fff;">'
      // Position number
      + '<div style="position:absolute;top:6px;left:6px;z-index:2;background:rgba(0,0,0,.55);color:#fff;font-size:10px;font-weight:700;border-radius:6px;padding:2px 7px;line-height:1.4;">' + (i + 1) + '</div>'
      // Done status dot
      + '<div style="position:absolute;top:6px;right:6px;z-index:2;width:10px;height:10px;border-radius:50%;background:' + doneColor + ';border:1.5px solid #fff;"></div>'
      // Carousel indicator
      + (photoCount > 1 ? '<div style="position:absolute;top:6px;left:50%;transform:translateX(-50%);z-index:2;background:rgba(0,0,0,.55);color:#fff;font-size:9px;font-weight:700;border-radius:6px;padding:2px 6px;">📷 ' + photoCount + '</div>' : '')
      // Play icon for video formats
      + (isVideoFmt ? '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;pointer-events:none;"><svg width="10" height="13" viewBox="0 0 10 13" fill="#fff"><path d="M1 1l8 5.5-8 5.5z"/></svg></div>' : '')
      // Media
      + '<div style="width:100%;height:100%;">' + mediaHtml + '</div>'
      // Overlay
      + '<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.7));padding:8px 8px 6px;z-index:1;">'
      + (overlayTitle ? '<div style="font-size:11px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + overlayTitle + '</div>' : '')
      + '<div style="display:flex;gap:4px;align-items:center;margin-top:2px;">'
      + (overlayDate ? '<span style="font-size:9px;color:rgba(255,255,255,.75);">' + overlayDate + '</span>' : '')
      + (overlayFormat ? '<span style="font-size:8px;color:#fff;background:rgba(255,255,255,.2);border-radius:4px;padding:1px 5px;">' + overlayFormat + '</span>' : '')
      + '</div>'
      + '</div>'
      + '</div>';
  }

  // Add new post slot
  html += '<div class="feed-cell feed-cell-add" onclick="addFeedPost()"'
    + ' style="aspect-ratio:1;border-radius:8px;border:2px dashed #D1D5DB;display:flex;align-items:center;justify-content:center;cursor:pointer;background:#FAFAFA;transition:border-color .2s,background .2s;"'
    + ' onmouseenter="this.style.borderColor=\'#8B5CF6\';this.style.background=\'#F5F3FF\'"'
    + ' onmouseleave="this.style.borderColor=\'#D1D5DB\';this.style.background=\'#FAFAFA\'">'
    + '<div style="text-align:center;color:#9CA3AF;">'
    + '<div style="font-size:28px;line-height:1;">+</div>'
    + '<div style="font-size:10px;margin-top:2px;">Ajouter</div>'
    + '</div></div>';

  // Fill to 9 cells minimum with empty placeholders
  var total = posts.length + 1; // +1 for the add slot
  for (var j = total; j < 9; j++) {
    html += '<div class="feed-cell feed-cell-empty" style="aspect-ratio:1;border-radius:8px;background:#F9FAFB;border:1px solid #F3F4F6;"></div>';
  }

  container.innerHTML = html;
}

// ═══════════════════════════════════════════════
//  Drag & Drop
// ═══════════════════════════════════════════════

function feedDragStart(e, idx, plat) {
  dragSrcIdx = idx;
  dragSrcPlat = plat;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', idx);
  if (e.target && e.target.style) {
    e.target.style.opacity = '0.5';
  }
}

function feedDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function feedDrop(e, toIdx, plat) {
  e.preventDefault();
  e.stopPropagation();

  // Only allow drop within same platform
  if (dragSrcPlat !== plat || dragSrcIdx === null || dragSrcIdx === toIdx) return;

  var arr = FEED_DATA[plat];
  if (!arr || dragSrcIdx >= arr.length || toIdx >= arr.length) return;

  // Move item from dragSrcIdx to toIdx
  var item = arr.splice(dragSrcIdx, 1)[0];
  arr.splice(toIdx, 0, item);

  saveFeedData();
  renderFeedGrid(plat);
}

function feedDragEnd(e) {
  dragSrcIdx = null;
  dragSrcPlat = null;
  if (e.target && e.target.style) {
    e.target.style.opacity = '1';
  }
}

// ═══════════════════════════════════════════════
//  Feed Modal (uses dedicated #feed-modal)
// ═══════════════════════════════════════════════

function addFeedPost() {
  feedEditIdx = null;
  openFeedModal(null, feedPlat);
}

function openFeedModal(idx, plat) {
  feedEditIdx = idx;
  var isEdit = idx !== null && idx !== undefined;
  var post = isEdit ? (FEED_DATA[plat] || [])[idx] || {} : {};

  var titleVal = post.title || '';
  var dateVal = post.date || '';
  var formatVal = post.format || '';
  var descVal = post.description || '';
  var hashVal = post.hashtags || '';
  var doneVal = post.done || false;
  var mediaPreview = '';

  // Init carousel photos state
  window._carouselPhotos = (post.photos && post.photos.length > 0) ? post.photos.slice() : (post.media ? [post.media] : []);
  // Init cover state
  window._carouselCover = post.cover || null;

  if (post.media && post.media.indexOf('data:video') === 0) {
    mediaPreview = '<video src="' + post.media + '" style="width:100%;max-height:200px;object-fit:contain;border-radius:8px;" controls muted></video>';
  } else if (post.media && post.media.indexOf('data:') === 0) {
    mediaPreview = '<img src="' + post.media + '" style="width:100%;max-height:200px;object-fit:contain;border-radius:8px;" alt="">';
  }

  var charCount = descVal.length;

  var formatOptions = ['', 'Reel', 'Carousel', 'Photo', 'Story', 'IGTV', 'TikTok', 'Short'];
  var formatSelect = '';
  for (var f = 0; f < formatOptions.length; f++) {
    var sel = formatVal === formatOptions[f] ? ' selected' : '';
    var label = formatOptions[f] || '-- Format --';
    formatSelect += '<option value="' + escapeHtml(formatOptions[f]) + '"' + sel + '>' + escapeHtml(label) + '</option>';
  }

  // Update modal title
  var titleEl = document.getElementById('feed-modal-title');
  if (titleEl) titleEl.textContent = isEdit ? 'Modifier le post' : 'Nouveau post';

  var html = ''
    // Photos / Media upload
    + '<div style="margin-bottom:14px;">'
    + '<label style="font-size:12px;font-weight:600;color:#6B7280;display:block;margin-bottom:6px;">Photos <span style="font-weight:400;color:#9CA3AF;font-size:11px;">(max 9)</span></label>'
    + '<div id="feed-carousel-strip" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;"></div>'
    + '<div style="display:flex;gap:8px;align-items:center;">'
    + '<label style="display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:8px;border:1.5px dashed #D1D5DB;background:#F9FAFB;font-size:12px;font-weight:600;color:#6B7280;cursor:pointer;">'
    + '+ Ajouter une photo'
    + '<input type="file" id="feed-media-input" accept="image/*,video/*" multiple onchange="handleCarouselAdd(event)" style="display:none;">'
    + '</label>'
    + '</div>'
    + '</div>'

    // Date
    + '<div style="margin-bottom:14px;">'
    + '<label style="font-size:12px;font-weight:600;color:#6B7280;display:block;margin-bottom:6px;">Date</label>'
    + '<input type="date" id="feed-date" value="' + escapeHtml(dateVal) + '" style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;">'
    + '</div>'

    // Format
    + '<div style="margin-bottom:14px;">'
    + '<label style="font-size:12px;font-weight:600;color:#6B7280;display:block;margin-bottom:6px;">Format</label>'
    + '<select id="feed-format" onchange="feedFormatChanged(this)" style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;font-family:inherit;background:#fff;box-sizing:border-box;">'
    + formatSelect
    + '</select>'
    + '</div>'

    // Cover (Reel / TikTok / Short / IGTV)
    + (function(){
        var vf = ['Reel','TikTok','Short','IGTV','Story'];
        var show = vf.indexOf(formatVal) !== -1;
        var prev = window._carouselCover
          ? '<div style="position:relative;display:inline-block;"><img src="' + window._carouselCover + '" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1.5px solid #E5E7EB;" alt=""><button onclick="window._carouselCover=null;renderCoverPreview()" style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;border:none;background:#EF4444;color:#fff;font-size:11px;cursor:pointer;line-height:1;padding:0;">×</button></div>'
          : '<div style="color:#9CA3AF;font-size:12px;">Aucune miniature</div>';
        return '<div id="feed-cover-section" style="' + (show ? '' : 'display:none;') + 'margin-bottom:14px;">'
          + '<label style="font-size:12px;font-weight:600;color:#6B7280;display:block;margin-bottom:6px;">Miniature de couverture</label>'
          + '<div id="feed-cover-preview" style="margin-bottom:8px;">' + prev + '</div>'
          + '<label style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:8px;border:1.5px dashed #D1D5DB;background:#F9FAFB;font-size:12px;font-weight:600;color:#6B7280;cursor:pointer;">'
          + '+ Choisir une miniature'
          + '<input type="file" accept="image/*" onchange="handleCoverUpload(event)" style="display:none;">'
          + '</label>'
          + '</div>';
      })()

    // Title
    + '<div style="margin-bottom:14px;">'
    + '<label style="font-size:12px;font-weight:600;color:#6B7280;display:block;margin-bottom:6px;">Titre</label>'
    + '<input type="text" id="feed-title" value="' + escapeHtml(titleVal) + '" placeholder="Titre du post..." style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;">'
    + '</div>'

    // Description with char count
    + '<div style="margin-bottom:14px;">'
    + '<label style="font-size:12px;font-weight:600;color:#6B7280;display:block;margin-bottom:6px;">Description</label>'
    + '<textarea id="feed-desc" rows="4" placeholder="Description du post..." oninput="var c=this.value.length;document.getElementById(\'feed-char-count\').textContent=c+\'/2200\';document.getElementById(\'feed-char-count\').style.color=c>2200?\'#EF4444\':\'#9CA3AF\';" style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;box-sizing:border-box;">' + escapeHtml(descVal) + '</textarea>'
    + '<div id="feed-char-count" style="text-align:right;font-size:11px;color:' + (charCount > 2200 ? '#EF4444' : '#9CA3AF') + ';margin-top:4px;">' + charCount + '/2200</div>'
    + '</div>'

    // Hashtags
    + '<div style="margin-bottom:14px;">'
    + '<label style="font-size:12px;font-weight:600;color:#6B7280;display:block;margin-bottom:6px;">Hashtags</label>'
    + '<input type="text" id="feed-hashtags" value="' + escapeHtml(hashVal) + '" placeholder="#mode #lifestyle #inspiration" oninput="updateHashPreview()" style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;">'
    + '<div id="feed-hash-preview" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:2px;"></div>'
    + '</div>'

    // Done checkbox
    + '<div style="margin-bottom:18px;display:flex;align-items:center;gap:8px;">'
    + '<input type="checkbox" id="feed-done"' + (doneVal ? ' checked' : '') + ' style="width:16px;height:16px;accent-color:#8B5CF6;">'
    + '<label for="feed-done" style="font-size:13px;color:#374151;cursor:pointer;">Marquer comme fait</label>'
    + '</div>'

    // Action buttons
    + '<div style="display:flex;gap:8px;justify-content:flex-end;">'
    + (isEdit ? '<button onclick="deleteFeedPost()" style="padding:8px 16px;border-radius:8px;border:1.5px solid #FCA5A5;background:#FEF2F2;color:#EF4444;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;margin-right:auto;">Supprimer</button>' : '')
    + '<button onclick="closeFeedModal()" style="padding:8px 16px;border-radius:8px;border:1.5px solid #E5E7EB;background:#F9FAFB;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Annuler</button>'
    + '<button onclick="saveFeedPost()" style="padding:8px 16px;border-radius:8px;border:none;background:#8B5CF6;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Enregistrer</button>'
    + '</div>';

  // Render into dedicated feed-modal
  var body = document.getElementById('feed-modal-body');
  if (body) body.innerHTML = html;
  var modal = document.getElementById('feed-modal');
  if (modal) modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Render hash preview + carousel strip after modal opens
  setTimeout(function() {
    updateHashPreview();
    renderCarouselStrip();
  }, 50);
}

function updateHashPreview() {
  var input = document.getElementById('feed-hashtags');
  var preview = document.getElementById('feed-hash-preview');
  if (!input || !preview) return;

  var val = input.value.trim();
  if (!val) {
    preview.innerHTML = '';
    return;
  }
  var tags = val.split(/[\s,]+/).filter(function(t) { return t; });
  var html = '';
  for (var i = 0; i < tags.length; i++) {
    var tag = tags[i].charAt(0) === '#' ? tags[i] : '#' + tags[i];
    html += '<span style="display:inline-block;background:#EDE9FE;color:#7C3AED;font-size:11px;padding:2px 8px;border-radius:12px;margin:2px;">' + escapeHtml(tag) + '</span>';
  }
  preview.innerHTML = html;
}

function closeFeedModal() {
  feedEditIdx = null;
  var modal = document.getElementById('feed-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

// ═══════════════════════════════════════════════
//  Feed Media Upload
// ═══════════════════════════════════════════════

function handleCarouselAdd(event) {
  var files = event.target.files;
  if (!files || !files.length) return;
  if (!window._carouselPhotos) window._carouselPhotos = [];

  var toProcess = Math.min(files.length, 9 - window._carouselPhotos.length);
  var processed = 0;

  for (var i = 0; i < toProcess; i++) {
    (function(file) {
      var reader = new FileReader();
      reader.onload = function(ev) {
        var dataUrl = ev.target.result;
        if (file.type.indexOf('video') === 0) {
          window._carouselPhotos.push(dataUrl);
          processed++;
          if (processed === toProcess) renderCarouselStrip();
        } else {
          compressImage(dataUrl, function(compressed) {
            window._carouselPhotos.push(compressed);
            processed++;
            if (processed === toProcess) renderCarouselStrip();
          });
        }
      };
      reader.readAsDataURL(file);
    })(files[i]);
  }
  // Reset input so same file can be re-added
  event.target.value = '';
}

function removeCarouselPhoto(idx) {
  if (!window._carouselPhotos) return;
  window._carouselPhotos.splice(idx, 1);
  renderCarouselStrip();
}

function moveCarouselPhoto(idx, dir) {
  var photos = window._carouselPhotos || [];
  var newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= photos.length) return;
  var tmp = photos[idx];
  photos[idx] = photos[newIdx];
  photos[newIdx] = tmp;
  renderCarouselStrip();
}

function feedFormatChanged(sel) {
  var vf = ['Reel', 'TikTok', 'Short', 'IGTV', 'Story'];
  var section = document.getElementById('feed-cover-section');
  if (section) section.style.display = vf.indexOf(sel.value) !== -1 ? '' : 'none';
}

function handleCoverUpload(event) {
  var file = event.target.files && event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    compressImage(e.target.result, function(compressed) {
      window._carouselCover = compressed;
      renderCoverPreview();
    });
  };
  reader.readAsDataURL(file);
}

function renderCoverPreview() {
  var el = document.getElementById('feed-cover-preview');
  if (!el) return;
  if (!window._carouselCover) {
    el.innerHTML = '<div style="color:#9CA3AF;font-size:12px;">Aucune miniature</div>';
    return;
  }
  el.innerHTML = '<div style="position:relative;display:inline-block;">'
    + '<img src="' + window._carouselCover + '" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1.5px solid #E5E7EB;" alt="">'
    + '<button onclick="window._carouselCover=null;renderCoverPreview()" style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;border:none;background:#EF4444;color:#fff;font-size:11px;cursor:pointer;line-height:1;padding:0;">×</button>'
    + '</div>';
}

function renderCarouselStrip() {
  var strip = document.getElementById('feed-carousel-strip');
  if (!strip) return;
  var photos = window._carouselPhotos || [];
  var html = '';
  for (var i = 0; i < photos.length; i++) {
    var src = photos[i];
    var isVideo = src && src.indexOf('data:video') === 0;
    // Wrapper column: thumbnail + reorder arrows
    html += '<div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex-shrink:0;">';
    // Thumbnail
    html += '<div style="position:relative;width:72px;height:72px;border-radius:8px;overflow:hidden;border:1.5px solid #E5E7EB;">';
    if (isVideo) {
      html += '<video src="' + src + '" style="width:100%;height:100%;object-fit:cover;" muted></video>';
    } else {
      html += '<img src="' + src + '" style="width:100%;height:100%;object-fit:cover;" alt="">';
    }
    if (i === 0) html += '<div style="position:absolute;top:2px;left:2px;background:rgba(0,0,0,.6);color:#fff;font-size:8px;padding:1px 4px;border-radius:4px;">Cover</div>';
    html += '<button onclick="removeCarouselPhoto(' + i + ')" style="position:absolute;top:2px;right:2px;width:16px;height:16px;border-radius:50%;border:none;background:rgba(0,0,0,.6);color:#fff;font-size:11px;cursor:pointer;line-height:1;padding:0;">×</button>';
    if (!isVideo) html += '<button onclick="openImgEditor(' + i + ')" style="position:absolute;bottom:2px;right:2px;width:18px;height:18px;border-radius:4px;border:none;background:rgba(139,92,246,.85);color:#fff;font-size:9px;cursor:pointer;line-height:1;padding:0;" title="Modifier">✏️</button>';
    html += '</div>';
    // Reorder arrows
    html += '<div style="display:flex;gap:2px;">';
    html += '<button onclick="moveCarouselPhoto(' + i + ',-1)" style="width:32px;height:14px;border:none;background:#E5E7EB;border-radius:3px;font-size:8px;cursor:pointer;padding:0;line-height:1;color:#6B7280;' + (i === 0 ? 'opacity:.3;pointer-events:none;' : '') + '">◀</button>';
    html += '<button onclick="moveCarouselPhoto(' + i + ',1)" style="width:32px;height:14px;border:none;background:#E5E7EB;border-radius:3px;font-size:8px;cursor:pointer;padding:0;line-height:1;color:#6B7280;' + (i === photos.length - 1 ? 'opacity:.3;pointer-events:none;' : '') + '">▶</button>';
    html += '</div>';
    html += '</div>'; // close column wrapper
  }
  if (photos.length === 0) {
    html = '<div style="color:#9CA3AF;font-size:12px;padding:4px 0;">Aucune photo ajoutée</div>';
  }
  strip.innerHTML = html;
}

// ═══════════════════════════════════════════════
//  Save / Delete Feed Post
// ═══════════════════════════════════════════════

function saveFeedPost() {
  var title = (document.getElementById('feed-title') || {}).value || '';
  var date = (document.getElementById('feed-date') || {}).value || '';
  var format = (document.getElementById('feed-format') || {}).value || '';
  var desc = (document.getElementById('feed-desc') || {}).value || '';
  var hashtags = (document.getElementById('feed-hashtags') || {}).value || '';
  var done = (document.getElementById('feed-done') || {}).checked || false;

  // Get photos from carousel state
  var photos = window._carouselPhotos || [];
  var media = photos.length > 0 ? photos[0] : null;

  var post = {
    title: title,
    date: date,
    format: format,
    description: desc,
    hashtags: hashtags,
    done: done,
    media: media,
    photos: photos,
    cover: window._carouselCover || null
  };

  if (!FEED_DATA[feedPlat]) FEED_DATA[feedPlat] = [];

  if (feedEditIdx !== null && feedEditIdx < FEED_DATA[feedPlat].length) {
    // Update existing
    FEED_DATA[feedPlat][feedEditIdx] = post;
  } else {
    // Add new
    FEED_DATA[feedPlat].push(post);
  }

  saveFeedData();
  renderFeedGrid(feedPlat);
  updateFeedCount();
  closeFeedModal();
  showSync('Post enregistre', null);
}

// ═══════════════════════════════════════════════
//  Image Editor — drag-to-crop
// ═══════════════════════════════════════════════

var _ie = {
  idx: null, ratio: '1:1',
  imgX: 0, imgY: 0, imgW: 0, imgH: 0,
  vpW: 0, vpH: 0, scale: 1,
  dragging: false,
  startX: 0, startY: 0, startImgX: 0, startImgY: 0
};

function openImgEditor(photoIdx) {
  var photos = window._carouselPhotos || [];
  var src = photos[photoIdx];
  if (!src || src.indexOf('data:video') === 0) return;
  _ie.idx = photoIdx;
  _ie.ratio = '1:1';

  var modal = document.getElementById('img-editor-modal');
  if (!modal) return;

  // Activate 1:1 button by default
  document.querySelectorAll('.img-editor-crop-btn').forEach(function(b) {
    b.classList.toggle('active', b.textContent.trim() === '1:1');
  });

  var img = new Image();
  img.onload = function() {
    window._ieImg = img;
    _ieUpdateViewport();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };
  img.src = src;
}

function _ieUpdateViewport() {
  var img = window._ieImg;
  if (!img) return;
  var vp = document.getElementById('ie-viewport');
  var ieEl = document.getElementById('ie-img');
  if (!vp || !ieEl) return;

  var maxVp = 280;
  var vpW, vpH;
  if (_ie.ratio === 'free') {
    // Keep original ratio, fit in 280px box
    if (img.width >= img.height) { vpW = maxVp; vpH = Math.round(maxVp * img.height / img.width); }
    else { vpH = maxVp; vpW = Math.round(maxVp * img.width / img.height); }
  } else {
    var parts = _ie.ratio.split(':');
    var rW = parseFloat(parts[0]), rH = parseFloat(parts[1]);
    if (rW / rH >= 1) { vpW = maxVp; vpH = Math.round(maxVp * rH / rW); }
    else { vpH = maxVp; vpW = Math.round(maxVp * rW / rH); }
  }

  vp.style.width = vpW + 'px';
  vp.style.height = vpH + 'px';
  _ie.vpW = vpW;
  _ie.vpH = vpH;

  // Scale image to cover viewport
  var scale = Math.max(vpW / img.width, vpH / img.height);
  _ie.scale = scale;
  _ie.imgW = Math.round(img.width * scale);
  _ie.imgH = Math.round(img.height * scale);

  // Center
  _ie.imgX = Math.round((vpW - _ie.imgW) / 2);
  _ie.imgY = Math.round((vpH - _ie.imgH) / 2);

  ieEl.src = img.src;
  ieEl.style.width = _ie.imgW + 'px';
  ieEl.style.height = _ie.imgH + 'px';
  ieEl.style.left = _ie.imgX + 'px';
  ieEl.style.top = _ie.imgY + 'px';
}

function applyImgFilters() {
  var ieEl = document.getElementById('ie-img');
  if (!ieEl) return;
  var b = parseInt((document.getElementById('ie-brightness') || {}).value || 100);
  var c = parseInt((document.getElementById('ie-contrast') || {}).value || 100);
  var s = parseInt((document.getElementById('ie-saturation') || {}).value || 100);
  ieEl.style.filter = 'brightness(' + b + '%) contrast(' + c + '%) saturate(' + s + '%)';
}

function setImgCrop(ratio, btn) {
  _ie.ratio = ratio;
  document.querySelectorAll('.img-editor-crop-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  _ieUpdateViewport();
}

function _ieMouseDown(e) {
  _ie.dragging = true;
  _ie.startX = e.clientX; _ie.startY = e.clientY;
  _ie.startImgX = _ie.imgX; _ie.startImgY = _ie.imgY;
  e.preventDefault();
}

function _ieMouseMove(e) {
  if (!_ie.dragging) return;
  _ieDrag(e.clientX - _ie.startX, e.clientY - _ie.startY);
}

function _ieTouchStart(e) {
  if (!e.touches[0]) return;
  _ie.dragging = true;
  _ie.startX = e.touches[0].clientX; _ie.startY = e.touches[0].clientY;
  _ie.startImgX = _ie.imgX; _ie.startImgY = _ie.imgY;
  e.preventDefault();
}

function _ieTouchMove(e) {
  if (!_ie.dragging || !e.touches[0]) return;
  _ieDrag(e.touches[0].clientX - _ie.startX, e.touches[0].clientY - _ie.startY);
  e.preventDefault();
}

function _ieDrag(dx, dy) {
  var newX = Math.min(0, Math.max(_ie.vpW - _ie.imgW, _ie.startImgX + dx));
  var newY = Math.min(0, Math.max(_ie.vpH - _ie.imgH, _ie.startImgY + dy));
  _ie.imgX = newX; _ie.imgY = newY;
  var ieEl = document.getElementById('ie-img');
  if (ieEl) { ieEl.style.left = newX + 'px'; ieEl.style.top = newY + 'px'; }
}

function _ieMouseUp() { _ie.dragging = false; }

function saveImgEdit() {
  if (_ie.idx === null || !window._ieImg) return;
  var img = window._ieImg;
  var canvas = document.createElement('canvas');

  // Output at 1080px on long side
  var rW, rH;
  if (_ie.ratio === 'free') { rW = img.width; rH = img.height; }
  else { var p = _ie.ratio.split(':'); rW = parseFloat(p[0]); rH = parseFloat(p[1]); }

  var outMax = 1080;
  var outW, outH;
  if (rW >= rH) { outW = outMax; outH = Math.round(outMax * rH / rW); }
  else { outH = outMax; outW = Math.round(outH * rW / rH); }

  canvas.width = outW;
  canvas.height = outH;
  var ctx = canvas.getContext('2d');

  // Crop coordinates in natural image pixels
  var cropX = -_ie.imgX / _ie.scale;
  var cropY = -_ie.imgY / _ie.scale;
  var cropW = _ie.ratio === 'free' ? img.width : _ie.vpW / _ie.scale;
  var cropH = _ie.ratio === 'free' ? img.height : _ie.vpH / _ie.scale;

  var b = parseInt((document.getElementById('ie-brightness') || {}).value || 100);
  var c = parseInt((document.getElementById('ie-contrast') || {}).value || 100);
  var s = parseInt((document.getElementById('ie-saturation') || {}).value || 100);
  ctx.filter = 'brightness(' + b + '%) contrast(' + c + '%) saturate(' + s + '%)';
  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

  window._carouselPhotos[_ie.idx] = canvas.toDataURL('image/jpeg', 0.85);
  renderCarouselStrip();
  closeImgEditor();
}

function closeImgEditor() {
  var modal = document.getElementById('img-editor-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
  _ie.idx = null;
  _ie.dragging = false;
}

function deleteFeedPost() {
  if (feedEditIdx === null) return;

  askConfirm('Supprimer ce post du feed ?', function() {
    if (FEED_DATA[feedPlat] && feedEditIdx < FEED_DATA[feedPlat].length) {
      FEED_DATA[feedPlat].splice(feedEditIdx, 1);
      saveFeedData();
      renderFeedGrid(feedPlat);
      updateFeedCount();
    }
    closeFeedModal();
    showSync('Post supprime', null);
  });
}

// ═══════════════════════════════════════════════
//  IG Profile
// ═══════════════════════════════════════════════

async function loadIgProfile() {
  var prof = await cloudLoad('ig_profile', { handle: 'meryne.eis', bio: '', avatar: null, followers: null });
  IG_PROFILE = prof;
  if (!IG_PROFILE.handle) IG_PROFILE.handle = 'meryne.eis';

  var hl = await cloudLoad('ig_highlights', []);
  IG_HIGHLIGHTS = hl;
  if (!Array.isArray(IG_HIGHLIGHTS)) IG_HIGHLIGHTS = [];

  var stories = await cloudLoad('ig_stories', []);
  IG_STORIES = stories;
  if (!Array.isArray(IG_STORIES)) IG_STORIES = [];
}

function saveIgProfile() {
  cloudSave('ig_profile', IG_PROFILE);
  cloudSave('ig_highlights', IG_HIGHLIGHTS);
  cloudSave('ig_stories', IG_STORIES);
}

// ═══════════════════════════════════════════════
//  Highlights Rendering
// ═══════════════════════════════════════════════

function renderHighlights() {
  // Render avatar
  var avatarEl = document.getElementById('ig-avatar-img');
  if (avatarEl) {
    if (IG_PROFILE.avatar) {
      avatarEl.innerHTML = '<img src="' + IG_PROFILE.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">';
    } else {
      avatarEl.innerHTML = '<div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#667EEA,#764BA2);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:700;">' + escapeHtml(IG_PROFILE.handle.charAt(0).toUpperCase()) + '</div>';
    }
  }
  // Update avatar ring: gradient when stories exist, gray when empty
  var ringEl = document.querySelector('.ig-avatar-ring');
  if (ringEl) {
    if (IG_STORIES.length > 0) {
      ringEl.style.background = 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)';
    } else {
      ringEl.style.background = '#D1D5DB';
    }
  }

  // Render bio
  var bioEl = document.getElementById('ig-bio-display');
  if (bioEl && IG_PROFILE.bio) {
    bioEl.innerHTML = '<strong>' + escapeHtml(IG_PROFILE.handle) + '</strong><br>' + escapeHtml(IG_PROFILE.bio);
  }

  // Render followers
  var followersEl = document.getElementById('ig-followers-count');
  if (followersEl && IG_PROFILE.followers !== null) {
    followersEl.textContent = IG_PROFILE.followers.toLocaleString('fr-FR');
  }

  // Render highlights row
  var hlContainer = document.getElementById('ig-highlights-row');
  if (!hlContainer) return;

  var html = '';
  for (var i = 0; i < IG_HIGHLIGHTS.length; i++) {
    var hl = IG_HIGHLIGHTS[i];
    var cover = '';
    if (hl.media) {
      cover = '<img src="' + hl.media + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">';
    } else {
      cover = '<div style="width:100%;height:100%;border-radius:50%;background:#F3F4F6;display:flex;align-items:center;justify-content:center;color:#D1D5DB;font-size:18px;">+</div>';
    }

    html += '<div onclick="editHighlight(' + i + ')" style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;flex-shrink:0;">'
      + '<div style="width:56px;height:56px;border-radius:50%;border:2px solid #E5E7EB;padding:2px;background:#fff;">'
      + '<div style="width:100%;height:100%;border-radius:50%;overflow:hidden;">' + cover + '</div>'
      + '</div>'
      + '<span style="font-size:10px;color:#374151;max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;">' + escapeHtml(hl.label || '') + '</span>'
      + '</div>';
  }

  // Add new highlight button
  html += '<div onclick="addHighlight()" style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;flex-shrink:0;">'
    + '<div style="width:56px;height:56px;border-radius:50%;border:2px dashed #D1D5DB;display:flex;align-items:center;justify-content:center;background:#FAFAFA;transition:border-color .2s;"'
    + ' onmouseenter="this.style.borderColor=\'#8B5CF6\'" onmouseleave="this.style.borderColor=\'#D1D5DB\'">'
    + '<span style="font-size:22px;color:#9CA3AF;line-height:1;">+</span>'
    + '</div>'
    + '<span style="font-size:10px;color:#9CA3AF;">Ajouter</span>'
    + '</div>';

  hlContainer.innerHTML = html;
}

// ═══════════════════════════════════════════════
//  Highlight CRUD (uses generic modal)
// ═══════════════════════════════════════════════

function addHighlight() {
  openHighlightModal(null);
}

function editHighlight(i) {
  openHighlightModal(i);
}

function openHighlightModal(idx) {
  var isEdit = idx !== null && idx !== undefined;
  var hl = isEdit ? IG_HIGHLIGHTS[idx] || {} : {};
  var labelVal = hl.label || '';
  var mediaPreview = '';

  if (hl.media) {
    mediaPreview = '<img src="' + hl.media + '" style="width:64px;height:64px;object-fit:cover;border-radius:50%;" alt="">';
  }

  var html = '<button class="modal-x" onclick="closeModal()">&times;</button>'
    + '<h2>' + (isEdit ? 'Modifier la story' : 'Nouvelle story a la une') + '</h2>'

    // Media
    + '<div style="margin-bottom:14px;text-align:center;">'
    + '<div id="hl-media-preview" style="margin-bottom:8px;display:inline-block;">' + mediaPreview + '</div>'
    + '<div><input type="file" id="hl-media-input" accept="image/*" onchange="handleHlMedia(event)" style="font-size:12px;"></div>'
    + '</div>'

    // Label
    + '<div style="margin-bottom:18px;">'
    + '<label style="font-size:12px;font-weight:600;color:#6B7280;display:block;margin-bottom:6px;">Label</label>'
    + '<input type="text" id="hl-label" value="' + escapeHtml(labelVal) + '" placeholder="Nom de la story..." maxlength="20" style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;">'
    + '</div>'

    // Actions
    + '<div style="display:flex;gap:8px;justify-content:flex-end;">'
    + (isEdit ? '<button onclick="deleteHighlight(' + idx + ')" style="padding:8px 16px;border-radius:8px;border:1.5px solid #FCA5A5;background:#FEF2F2;color:#EF4444;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;margin-right:auto;">Supprimer</button>' : '')
    + '<button onclick="closeModal()" style="padding:8px 16px;border-radius:8px;border:1.5px solid #E5E7EB;background:#F9FAFB;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Annuler</button>'
    + '<button onclick="saveHighlight(' + (isEdit ? idx : 'null') + ')" style="padding:8px 16px;border-radius:8px;border:none;background:#8B5CF6;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Enregistrer</button>'
    + '</div>';

  openModal(html);
}

function handleHlMedia(ev) {
  var file = ev.target.files && ev.target.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function(e) {
    var dataUrl = e.target.result;
    compressImage(dataUrl, function(compressed) {
      var preview = document.getElementById('hl-media-preview');
      if (preview) {
        preview.innerHTML = '<img src="' + compressed + '" style="width:64px;height:64px;object-fit:cover;border-radius:50%;" alt="">';
        preview.setAttribute('data-media', compressed);
      }
    });
  };
  reader.readAsDataURL(file);
}

function saveHighlight(idx) {
  var label = (document.getElementById('hl-label') || {}).value || '';
  var preview = document.getElementById('hl-media-preview');
  var media = null;

  if (preview && preview.getAttribute('data-media')) {
    media = preview.getAttribute('data-media');
  } else if (idx !== null && IG_HIGHLIGHTS[idx]) {
    media = IG_HIGHLIGHTS[idx].media || null;
  }

  var hl = { label: label, media: media };

  if (idx !== null && idx < IG_HIGHLIGHTS.length) {
    IG_HIGHLIGHTS[idx] = hl;
  } else {
    IG_HIGHLIGHTS.push(hl);
  }

  saveIgProfile();
  renderHighlights();
  closeModal();
  showSync('Story enregistree', null);
}

function deleteHighlight(idx) {
  askConfirm('Supprimer cette story a la une ?', function() {
    if (idx < IG_HIGHLIGHTS.length) {
      IG_HIGHLIGHTS.splice(idx, 1);
      saveIgProfile();
      renderHighlights();
    }
    closeModal();
    showSync('Story supprimee', null);
  });
}

// ═══════════════════════════════════════════════
//  Stories
// ═══════════════════════════════════════════════

function openStoryArea() {
  if (IG_STORIES.length === 0) {
    // No stories yet — open picker to add one
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*,video/*';
    inp.style.display = 'none';
    inp.onchange = handleStoryAdd;
    document.body.appendChild(inp);
    inp.click();
    setTimeout(function() { if (inp.parentNode) inp.parentNode.removeChild(inp); }, 60000);
  } else {
    viewStory(0);
  }
}

function handleStoryAdd(event) {
  var file = event.target.files && event.target.files[0];
  if (!file) return;
  var isVideo = file.type.indexOf('video') === 0;
  var reader = new FileReader();
  reader.onload = function(e) {
    var addStory = function(data) {
      IG_STORIES.push({ media: data, type: isVideo ? 'video' : 'image', createdAt: Date.now() });
      saveIgProfile();
      renderHighlights();
      viewStory(IG_STORIES.length - 1);
    };
    if (isVideo) { addStory(e.target.result); }
    else { compressImage(e.target.result, addStory); }
  };
  reader.readAsDataURL(file);
}

function viewStory(idx) {
  if (!IG_STORIES.length) return;
  var viewer = document.getElementById('story-viewer');
  if (!viewer) return;
  viewer.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  _showStoryAt(idx);
}

function _showStoryAt(idx) {
  if (idx < 0 || idx >= IG_STORIES.length) { closeStoryViewer(); return; }
  _storyIdx = idx;
  clearTimeout(_storyTimer);
  var story = IG_STORIES[idx];
  var content = document.getElementById('story-content');
  if (content) {
    if (story.type === 'video') {
      content.innerHTML = '<video src="' + story.media + '" style="max-width:100%;max-height:100%;object-fit:contain;" autoplay muted playsinline></video>';
    } else {
      content.innerHTML = '<img src="' + story.media + '" style="max-width:100%;max-height:100%;object-fit:contain;" alt="">';
    }
  }
  // Progress bars
  var barsEl = document.getElementById('story-progress-bars');
  if (barsEl) {
    var ph = '';
    for (var i = 0; i < IG_STORIES.length; i++) {
      ph += '<div style="flex:1;height:2px;background:rgba(255,255,255,.35);border-radius:2px;overflow:hidden;">'
        + '<div style="height:100%;background:#fff;width:' + (i < idx ? 100 : 0) + '%;'
        + (i === idx ? 'animation:storyProgress 5s linear forwards;' : '') + '"></div>'
        + '</div>';
    }
    barsEl.innerHTML = ph;
  }
  var counter = document.getElementById('story-counter');
  if (counter) counter.textContent = (idx + 1) + ' / ' + IG_STORIES.length;
  _storyTimer = setTimeout(function() { _showStoryAt(idx + 1); }, 5000);
}

function prevStory() { clearTimeout(_storyTimer); _showStoryAt(_storyIdx - 1); }
function nextStory() { clearTimeout(_storyTimer); _showStoryAt(_storyIdx + 1); }

function deleteCurrentStory() {
  clearTimeout(_storyTimer);
  IG_STORIES.splice(_storyIdx, 1);
  saveIgProfile();
  renderHighlights();
  if (IG_STORIES.length === 0) { closeStoryViewer(); return; }
  _showStoryAt(Math.min(_storyIdx, IG_STORIES.length - 1));
}

function closeStoryViewer() {
  clearTimeout(_storyTimer);
  var viewer = document.getElementById('story-viewer');
  if (viewer) viewer.style.display = 'none';
  document.body.style.overflow = '';
}

// ═══════════════════════════════════════════════
//  IG Profile Modal (uses generic modal)
// ═══════════════════════════════════════════════

function openIgProfileModal() {
  var avatarPreview = '';
  if (IG_PROFILE.avatar) {
    avatarPreview = '<img src="' + IG_PROFILE.avatar + '" style="width:72px;height:72px;object-fit:cover;border-radius:50%;" alt="">';
  } else {
    avatarPreview = '<div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#667EEA,#764BA2);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:700;">' + escapeHtml(IG_PROFILE.handle.charAt(0).toUpperCase()) + '</div>';
  }

  var html = '<button class="modal-x" onclick="closeModal()">&times;</button>'
    + '<h2>Profil Instagram</h2>'

    // Avatar
    + '<div style="margin-bottom:16px;text-align:center;">'
    + '<div id="ig-avatar-preview" style="display:inline-block;margin-bottom:8px;">' + avatarPreview + '</div>'
    + '<div><input type="file" id="ig-avatar-input" accept="image/*" onchange="handleAvatarUpload(event)" style="font-size:12px;"></div>'
    + '</div>'

    // Handle
    + '<div class="fr"><label>Nom d\'utilisateur</label>'
    + '<input type="text" id="ig-handle-input" value="' + escapeHtml(IG_PROFILE.handle) + '" placeholder="@handle"></div>'

    // Bio
    + '<div class="fr"><label>Bio</label>'
    + '<textarea id="ig-bio-input" rows="3" placeholder="Votre bio Instagram...">' + escapeHtml(IG_PROFILE.bio || '') + '</textarea></div>'

    // Followers
    + '<div class="fr"><label>Abonnes</label>'
    + '<input type="number" id="ig-followers-input" value="' + (IG_PROFILE.followers !== null ? IG_PROFILE.followers : '') + '" placeholder="Nombre d\'abonnes"></div>'

    // Actions
    + '<div class="modal-acts">'
    + '<button class="btn-s" onclick="closeModal()">Annuler</button>'
    + '<button class="btn-p" onclick="saveIgProfileModal()">Enregistrer</button>'
    + '</div>';

  openModal(html);
}

function handleAvatarUpload(ev) {
  var file = ev.target.files && ev.target.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function(e) {
    var dataUrl = e.target.result;
    compressImage(dataUrl, function(compressed) {
      var preview = document.getElementById('ig-avatar-preview');
      if (preview) {
        preview.innerHTML = '<img src="' + compressed + '" style="width:72px;height:72px;object-fit:cover;border-radius:50%;" alt="">';
        preview.setAttribute('data-avatar', compressed);
      }
    });
  };
  reader.readAsDataURL(file);
}

function saveIgProfileModal() {
  var handle = (document.getElementById('ig-handle-input') || {}).value || 'meryne.eis';
  var bio = (document.getElementById('ig-bio-input') || {}).value || '';
  var followersVal = (document.getElementById('ig-followers-input') || {}).value;
  var followers = followersVal ? parseInt(followersVal, 10) : null;

  // Get avatar from preview data attribute or keep existing
  var preview = document.getElementById('ig-avatar-preview');
  if (preview && preview.getAttribute('data-avatar')) {
    IG_PROFILE.avatar = preview.getAttribute('data-avatar');
  }

  IG_PROFILE.handle = handle;
  IG_PROFILE.bio = bio;
  IG_PROFILE.followers = isNaN(followers) ? null : followers;

  saveIgProfile();
  renderHighlights();
  closeModal();
  showSync('Profil mis a jour', null);
}
