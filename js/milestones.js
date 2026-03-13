/* ═══════════════════════════════════════════════
   MERYNE STUDIO V4 — Badges & Milestones
   ═══════════════════════════════════════════════ */

var MS_DEFS = [
  {id:'p10',  em:'🎯', label:'10 posts publiés !',    msg:'Tu as publié 10 posts. Continue sur ta lancée !',            type:'posts', val:10},
  {id:'p25',  em:'🔥', label:'25 posts publiés !',    msg:'25 posts — tu es une machine à contenu !',                   type:'posts', val:25},
  {id:'p50',  em:'💎', label:'50 posts publiés !',    msg:'50 posts publiés. Tu es une vraie pro du contenu !',         type:'posts', val:50},
  {id:'v1k',  em:'👀', label:'1 000 vues atteintes !', msg:'1 000 vues — les gens découvrent ton univers !',            type:'views', val:1000},
  {id:'v10k', em:'🚀', label:'10 000 vues !',         msg:'10 000 vues — ton contenu cartonne !',                       type:'views', val:10000},
  {id:'v50k', em:'⭐', label:'50 000 vues !',         msg:'50 000 vues — tu attires une vraie audience !',              type:'views', val:50000},
  {id:'v100k',em:'🌟', label:'100 000 vues !',        msg:'100K vues ! Tu es en train de devenir virale !',            type:'views', val:100000},
  {id:'ig1k', em:'📸', label:'1 000 abonnés IG !',   msg:'1 000 followers Instagram — merci à ta communauté !',        type:'ig',    val:1000},
  {id:'ig5k', em:'💫', label:'5 000 abonnés IG !',   msg:'5 000 followers IG — tu construis quelque chose de beau !',  type:'ig',    val:5000},
  {id:'tt5k', em:'🎵', label:'5 000 abonnés TT !',   msg:'5 000 abonnés TikTok — ta présence grandit !',               type:'tt',    val:5000},
  {id:'tt10k',em:'🏆', label:'10 000 abonnés TT !',  msg:'10K TikTok — tu touches à l\'objectif !',                    type:'tt',    val:10000},
];

function checkMilestones() {
  var seen = JSON.parse(localStorage.getItem('seenMilestones') || '[]');
  var posted = PUBS.filter(function(p) { return p.done; }).length;
  var tv = PUBS.filter(function(p) { return p.done; }).reduce(function(s, p) { return s + (p.stats.v || 0); }, 0);
  var igLast = FW.filter(function(f) { return f.ig > 0; });
  var ttLast = FW.filter(function(f) { return f.tt > 0; });
  var igC = igLast.length ? igLast[igLast.length - 1].ig : 0;
  var ttC = ttLast.length ? ttLast[ttLast.length - 1].tt : 0;

  var vals = { posts: posted, views: tv, ig: igC, tt: ttC };

  for (var i = 0; i < MS_DEFS.length; i++) {
    var ms = MS_DEFS[i];
    if (seen.indexOf(ms.id) === -1 && vals[ms.type] >= ms.val) {
      seen.push(ms.id);
      localStorage.setItem('seenMilestones', JSON.stringify(seen));
      showMilestone(ms);
      break; // show one at a time
    }
  }
}

function showMilestone(ms) {
  var popup = document.getElementById('milestone-popup');
  if (!popup) return;

  // Generate confetti
  var confettiColors = ['#FF2D7A','#7C3AED','#F59E0B','#06B6D4','#059669','#EF4444'];
  var confettiHtml = '';
  for (var i = 0; i < 30; i++) {
    var color = confettiColors[i % confettiColors.length];
    var left = Math.random() * 100;
    var delay = (Math.random() * 1.5).toFixed(2);
    var dur = (1.5 + Math.random() * 1).toFixed(2);
    var size = 6 + Math.floor(Math.random() * 6);
    confettiHtml += '<div class="confetti-piece" style="left:' + left + '%;width:' + size + 'px;height:' + size + 'px;background:' + color + ';animation-delay:' + delay + 's;animation-duration:' + dur + 's;"></div>';
  }

  popup.innerHTML = '<div class="ms-overlay" onclick="closeMilestone()"></div>'
    + '<div class="ms-box">'
    + '<div class="confetti-wrap">' + confettiHtml + '</div>'
    + '<div class="ms-em">' + ms.em + '</div>'
    + '<div class="ms-title">' + escapeHtml(ms.label) + '</div>'
    + '<div class="ms-msg">' + escapeHtml(ms.msg) + '</div>'
    + '<button class="ms-close-btn" onclick="closeMilestone()">Super ! 🎉</button>'
    + '</div>';
  popup.style.display = 'flex';
}

function closeMilestone() {
  var popup = document.getElementById('milestone-popup');
  if (popup) popup.style.display = 'none';
}
