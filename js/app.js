/* ═══════════════════════════════════════════════
   MERYNE STUDIO V4 — Main App
   Global state, default data, init, tabs, KPIs
   ═══════════════════════════════════════════════ */

// ─── META ───
var SEM = {
  S1:{l:'Semaine 1',d:'8\u20139 Mars',c:'#FF2D7A',desc:'Lancement'},
  S2:{l:'Semaine 2',d:'10\u201316 Mars',c:'#7C3AED',desc:'Stock prod.'},
  S3:{l:'Semaine 3',d:'17\u201323 Mars',c:'#0891B2',desc:'Nouveau contenu'},
  S4:{l:'Semaine 4',d:'24\u201329 Mars',c:'#059669',desc:'\u00C9ducatif'},
  S5:{l:'Semaine 5',d:'30\u201331 Mars',c:'#DC2626',desc:'Bilan'}
};
var PM = {
  tiktok:{l:'TikTok',cls:'b-tt'},
  insta:{l:'Instagram',cls:'b-ig'},
  stories:{l:'Stories',cls:'b-st'}
};
var MONTHS = ['Janvier','F\u00E9vrier','Mars','Avril','Mai','Juin','Juillet','Ao\u00FBt','Septembre','Octobre','Novembre','D\u00E9cembre'];

// ─── DEFAULT DATA ───
var D_PROD = [
  {id:'p1',date:'Mer 5 Mars',em:'\uD83C\uDFB7',title:'Concert de Jazz',desc:'Photos + vid\u00E9os ambiance + outfit soir\u00E9e',plat:'TikTok + Insta',fmt:'GRWM / Reel',posts:'2',note:'Demander photos full body avant d\u00E9part',done:false,launch:false,script:{title:'Concert de Jazz \u2014 Plan de tournage',shots:[{n:1,d:'AVANT d\u00E9part : full body outfit devant miroir. 3-4 angles.'},{n:2,d:'GRWM acc\u00E9l\u00E9r\u00E9 : maquillage + coiffure avec musique jazz en fond.'},{n:3,d:'ARRIV\u00C9E : plan ext\u00E9rieur du lieu. 5-10s.'},{n:4,d:'INSIDE : d\u00E9tails verre, lumi\u00E8res, sc\u00E8ne. 3-4 clips.'},{n:5,d:'OUTFIT CHECK : full body dans la salle.'},{n:6,d:'MOMENTS LIVE : artiste sur sc\u00E8ne, ambiance.'},{n:7,d:'SORTIE : derni\u00E8re photo/vid\u00E9o dehors.'}]}},
  {id:'p2',date:'Jeu 6 Mars',em:'\uD83D\uDC62',title:'Unboxing Bottes ASOS',desc:'Ouverture colis + essayage 2 paires',plat:'TikTok',fmt:'Unboxing',posts:'1',note:'Film l\'ouverture + walking shot des 2 paires',done:false,launch:false,script:{title:'Unboxing Bottes ASOS \u2014 Script TikTok',shots:[{n:1,d:'HOOK (1-3s) : pose le colis, regarde cam\u00E9ra.'},{n:2,d:'OUVERTURE (5-8s) : ouvre en temps r\u00E9el.'},{n:3,d:'R\u00C9V\u00C9LATION paire 1 : gros plan d\u00E9tails.'},{n:4,d:'ESSAYAGE paire 1 : plan pied \u2192 full body.'},{n:5,d:'VERDICT paire 1 : pouce haut ou bas.'},{n:6,d:'PAIRE 2 : m\u00EAme structure.'},{n:7,d:'ANGLE GRANDE TAILLE : longueur tige sur jambe 1m82.'},{n:8,d:'FINAL : les 2 paires c\u00F4te \u00E0 c\u00F4te.'}]}},
  {id:'p3',date:'Ven 7 Mars',em:'\uD83D\uDECD',title:'Haul Zara',desc:'Gard\u00E9 vs renvoy\u00E9 \u2014 angle grande taille 1m82',plat:'TikTok + Insta',fmt:'Haul',posts:'2',note:'Hook fort : quand tu fais 1m82 chez Zara',done:false,launch:false,script:{title:'Haul Zara Grande Taille \u2014 Script',shots:[{n:1,d:'HOOK FORT : Haul Zara quand tu fais 1m82.'},{n:2,d:'PR\u00C9SENTE chaque pi\u00E8ce face cam\u00E9ra.'},{n:3,d:'ESSAYAGE : face, \u00BE, de dos.'},{n:4,d:'GARD\u00C9 : montre pourquoi \u00E7a marche.'},{n:5,d:'RENVOY\u00C9 : explique franchement.'},{n:6,d:'ASTUCE : donne 1 conseil par pi\u00E8ce renvoy\u00E9e.'},{n:7,d:'FINAL : pi\u00E8ces gard\u00E9es ensemble.'}]}},
  {id:'p4',date:'Sam 8 Mars 9h',em:'\uD83D\uDC84',title:'Collab Maquillage MUA',desc:'Transformation avant/apr\u00E8s avec copine maquilleuse',plat:'TikTok + Insta',fmt:'Transformation',posts:'2',note:'Tagger copine partout',done:false,launch:false,script:{title:'Collab MUA \u2014 Plan de tournage',shots:[{n:1,d:'AVANT : sans maquillage, cheveux naturels.'},{n:2,d:'PROCESSUS acc\u00E9l\u00E9r\u00E9 : \u00E9tapes cl\u00E9s.'},{n:3,d:'D\u00C9TAILS : gros plans yeux finis, l\u00E8vres.'},{n:4,d:'R\u00C9ACTION MIROIR : d\u00E9couverte authentique.'},{n:5,d:'R\u00C9V\u00C9LATION FINALE : full body avec outfit.'},{n:6,d:'DUO avec copine MUA.'},{n:7,d:'CTA : tague-la dans tous les posts.'}]}},
  {id:'p5',date:'Sam 8 Mars',em:'\uD83D\uDECD',title:'Shopping post-maquillage',desc:'Essayages cabine + coups de c\u0153ur',plat:'TikTok',fmt:'Haul shopping',posts:'1-2',note:'Courts clips 3-4s par pi\u00E8ce.',done:false,launch:false,script:{title:'Shopping Day \u2014 Script Cabine',shots:[{n:1,d:'HOOK : Shopping avec mon nouveau makeup.'},{n:2,d:'CABINE : chaque essayage 5-7s max.'},{n:3,d:'TAILLE OBLIGATOIRE : mentionner la taille.'},{n:4,d:'COUP DE C\u0152UR : montre ta r\u00E9action.'},{n:5,d:'FAIL : les essayages rat\u00E9s font le plus de vues.'},{n:6,d:'TRANSITION : claquement de doigts.'},{n:7,d:'PANIER FINAL : tout ce que tu prends.'}]}},
  {id:'p6',date:'Dim 8 Mars',em:'\u2615',title:'Shooting Tenue 1 \u2014 H\u00F4tel',desc:'Miroir full body \u00B7 Walking shot \u00B7 D\u00E9tail caf\u00E9',plat:'Instagram',fmt:'Carousel 7 slides',posts:'1 carousel',note:'Ambiance soft/dor\u00E9e. Lumi\u00E8re fen\u00EAtre.',done:false,launch:false,script:{title:'Carousel H\u00F4tel/Caf\u00E9 \u2014 7 slides',shots:[{n:1,d:'COVER : miroir full body dans lobby.'},{n:2,d:'WALKING : marche vers cam\u00E9ra.'},{n:3,d:'D\u00C9TAIL ACCESSOIRE : gros plan.'},{n:4,d:'ASSISE CAF\u00C9 : install\u00E9e \u00E0 table.'},{n:5,d:'DE DOS : vers une fen\u00EAtre lumineuse.'},{n:6,d:'SPONTAN\u00C9 : rires, moment distrait.'},{n:7,d:'SLIDE CTA : photo + texte.'}]}},
  {id:'p7',date:'Dim 8 Mars',em:'\uD83C\uDFA8',title:'Shooting Tenue 2 \u2014 Mus\u00E9e',desc:'De dos devant \u0153uvre \u00B7 Walking couloir',plat:'Instagram',fmt:'Carousel 7 slides',posts:'1 carousel',note:'Contraste toi/art.',done:false,launch:false,script:{title:'Carousel Mus\u00E9e \u2014 7 slides',shots:[{n:1,d:'COVER : de dos face \u00E0 une grande \u0153uvre.'},{n:2,d:'COULOIR WALKING : perspective.'},{n:3,d:'FACE \u00C0 L\'\u0152UVRE : regard cam\u00E9ra.'},{n:4,d:'D\u00C9TAIL AU SOL : chaussures sur parquet.'},{n:5,d:'POSE SCULPT\u00C9E.'},{n:6,d:'ESCALIER/ARCHITECTURE.'},{n:7,d:'SLIDE CTA : vote 1 2 ou 3.'}]}},
  {id:'p8',date:'Dim 8 Mars',em:'\uD83D\uDDFC',title:'Shooting Tenue 3 \u2014 Tour Eiffel',desc:'Walking vers Tour \u00B7 Vid\u00E9os dr\u00F4les \u00B7 Golden hour',plat:'Instagram + TikTok',fmt:'Carousel + TikToks',posts:'1 carousel + 2 TikToks',note:'Golden hour 17-18h',done:false,launch:false,script:{title:'Carousel + TikToks Tour Eiffel',shots:[{n:1,d:'COVER : marche vers cam\u00E9ra, Tour Eiffel derri\u00E8re.'},{n:2,d:'POSE PROFIL.'},{n:3,d:'FACE SOURIANTE.'},{n:4,d:'RUE HAUSSMANNIENNE.'},{n:5,d:'D\u00C9TAIL CHAUSSURE.'},{n:6,d:'MOMENT FUN.'},{n:7,d:'GOLDEN HOUR PORTRAIT.'},{n:8,d:'SLIDE CTA.'},{n:9,d:'TIKTOK 1 : POV shooting journ\u00E9e des femmes.'},{n:10,d:'TIKTOK 2 : pose Pinterest qui rate.'}]}},
  {id:'p9',date:'Dim 8 Mars 18h',em:'\uD83C\uDF38',title:'Vid\u00E9o Lancement \u2014 1ER POST OFFICIEL',desc:'3 tenues \u00B7 3 lieux \u00B7 Journ\u00E9e des Femmes',plat:'TikTok + Insta',fmt:'Reel + TikTok',posts:'2',note:'Publication officielle \u00E0 18h00',done:false,launch:true,script:{title:'Vid\u00E9o Lancement \u2014 Script',shots:[{n:1,d:'HOOK (2s) : plan rapide Tour Eiffel.'},{n:2,d:'MONTAGE RAPIDE : best-of 3 tenues.'},{n:3,d:'Tenue 1 H\u00F4tel : 2 clips.'},{n:4,d:'Tenue 2 Mus\u00E9e : 2 clips.'},{n:5,d:'Tenue 3 Tour Eiffel : 3 clips.'},{n:6,d:'FINAL (3s) : sourire, texte 8 mars.'},{n:7,d:'CAPTION : 3 tenues 3 lieux 1 journ\u00E9e.'}]}},
  {id:'p10',date:'D\u00E9j\u00E0 film\u00E9',em:'\uD83C\uDF5C',title:'Restaurant Cor\u00E9en',desc:'Photos + vid\u00E9os ambiance + outfits avec amies',plat:'TikTok + Insta',fmt:'TikTok + Reel',posts:'2',note:'Son girl dinner trending',done:false,launch:false,script:{title:'Restaurant Cor\u00E9en \u2014 Montage',shots:[{n:1,d:'HOOK : Girl dinner level cor\u00E9en.'},{n:2,d:'FOOD : clips app\u00E9tissants.'},{n:3,d:'OUTFITS : clip rapide de chaque fille.'},{n:4,d:'MOMENTS DR\u00D4LES.'},{n:5,d:'TOAST : verres qui trinquent.'},{n:6,d:'INSTAGRAM : photo flat lay.'}]}},
  {id:'p11',date:'D\u00E9j\u00E0 film\u00E9',em:'\uD83C\uDFB3',title:'Bowling + Anniversaire copain',desc:'Photos bowling + restaurant italien',plat:'TikTok + Insta',fmt:'TikTok humour',posts:'2',note:'Angle : look chic VS bowling',done:false,launch:false,script:{title:'Bowling Anniversaire \u2014 Script Humour',shots:[{n:1,d:'HOOK : Mon copain voulait bowling en mode chic.'},{n:2,d:'BOWLING : clips de toi qui joues.'},{n:3,d:'CONTRASTE COMIQUE.'},{n:4,d:'RESTAURANT APR\u00C8S.'},{n:5,d:'G\u00C2TEAU ANNIVERSAIRE.'}]}}
];

var D_PUBS = [
  {id:'pub1',sem:'S1',date:'08/03',day:8,mo:2,yr:2026,plat:'tiktok',fmt:'TikTok',title:'LANCEMENT \u2014 3 tenues \u00B7 3 lieux \u00B7 Journ\u00E9e des Femmes',son:'Son trending #8mars',heure:'18h00',tags:'#journeedesfemmes #shooting #paris',src:'Shooting 8 mars',done:false,launch:true,stats:{v:0,l:0,c:0,s:0,sh:0},script:{title:'Post lancement TikTok',shots:[{n:1,d:'Utilise le montage de la vid\u00E9o lancement'},{n:2,d:'Caption + publish \u00E0 18h00'},{n:3,d:'Reste dispo 30min pour r\u00E9pondre'}]}},
  {id:'pub2',sem:'S1',date:'08/03',day:8,mo:2,yr:2026,plat:'insta',fmt:'Reel',title:'Meilleur shot du shooting \u2014 Journ\u00E9e des Femmes',son:'Son inspirant',heure:'20h00',tags:'#journeedesfemmes #parisienne #ootd',src:'Shooting 8 mars',done:false,launch:true,stats:{v:0,l:0,c:0,s:0,sh:0},script:{title:'Reel Instagram lancement',shots:[{n:1,d:'Meilleur plan du shooting Tour Eiffel golden hour'},{n:2,d:'Son inspirant, texte minimal'},{n:3,d:'Caption : 8 mars Bonne journ\u00E9e des femmes'}]}},
  {id:'pub3',sem:'S1',date:'08/03',day:8,mo:2,yr:2026,plat:'stories',fmt:'Stories',title:'Coulisses shooting live \u2014 h\u00F4tel \u00B7 mus\u00E9e \u00B7 Tour Eiffel',son:'\u2014',heure:'Toute la journ\u00E9e',tags:'Stories live',src:'Shooting 8 mars',done:false,launch:true,stats:{v:0,l:0,c:0,s:0,sh:0},script:{title:'Stories live shooting',shots:[{n:1,d:'10h : Story arriv\u00E9e h\u00F4tel'},{n:2,d:'11h : Sondage laquelle tu pr\u00E9f\u00E8res'},{n:3,d:'13h : Story mus\u00E9e'},{n:4,d:'17h30 : Stories golden hour'},{n:5,d:'18h05 : Mon premier post est EN LIGNE'}]}},
  {id:'pub4',sem:'S1',date:'09/03',day:9,mo:2,yr:2026,plat:'insta',fmt:'Carousel',title:'Carousel Tenue 1 \u2014 Look H\u00F4tel / Caf\u00E9',son:'\u2014',heure:'12h00',tags:'#carousel #lookdujour',src:'Shooting 8 mars',done:false,launch:false,stats:{v:0,l:0,c:0,s:0,sh:0},script:{title:'Carousel Tenue 1',shots:[{n:1,d:'Slide 1 COVER : miroir'},{n:2,d:'Slide 2 : walking'},{n:3,d:'Slide 3 : d\u00E9tail accessoire'},{n:4,d:'Slide 4 : assise caf\u00E9'},{n:5,d:'Slide 5 : de dos'},{n:6,d:'Slide 6 : spontan\u00E9'},{n:7,d:'Slide 7 : CTA'}]}},
  {id:'pub5',sem:'S1',date:'09/03',day:9,mo:2,yr:2026,plat:'tiktok',fmt:'TikTok',title:'Soir\u00E9e Restaurant Cor\u00E9en \u2014 ambiance + looks',son:'Son girl dinner trending',heure:'18h00',tags:'#kbbq #girlsnight',src:'Contenu pr\u00EAt',done:false,launch:false,stats:{v:0,l:0,c:0,s:0,sh:0},script:{title:'TikTok Restaurant Cor\u00E9en',shots:[{n:1,d:'Utilise le script t\u00E2che p10'},{n:2,d:'Son : trending KBBQ'},{n:3,d:'Dur\u00E9e : 15-30s'}]}},
  {id:'pub6',sem:'S2',date:'10/03',day:10,mo:2,yr:2026,plat:'insta',fmt:'Carousel',title:'Carousel Tenue 2 \u2014 Look Mus\u00E9e',son:'\u2014',heure:'12h00',tags:'#carousel #museestyle',src:'Shooting 8 mars',done:false,launch:false,stats:{v:0,l:0,c:0,s:0,sh:0},script:{title:'Carousel Tenue 2 Mus\u00E9e',shots:[{n:1,d:'Slide 1 : de dos face \u0153uvre'},{n:2,d:'Slide 2 : walking couloir'},{n:3,d:'Slide 3 : face cam\u00E9ra'},{n:4,d:'Slide 4 : d\u00E9tail chaussure'},{n:5,d:'Slide 5 : pose sculpt\u00E9e'},{n:6,d:'Slide 6 : architecture'},{n:7,d:'Slide 7 : vote'}]}},
  {id:'pub7',sem:'S2',date:'10/03',day:10,mo:2,yr:2026,plat:'tiktok',fmt:'TikTok',title:'GRWM Concert Jazz \u2014 outfit soir\u00E9e + ambiance',son:'Son jazz lounge',heure:'18h00',tags:'#grwm #concert #jazz',src:'Concert Jazz',done:false,launch:false,stats:{v:0,l:0,c:0,s:0,sh:0},script:{title:'TikTok GRWM Jazz',shots:[{n:1,d:'Utilise le script t\u00E2che p1'},{n:2,d:'Montage acc\u00E9l\u00E9r\u00E9 GRWM + clips concert'},{n:3,d:'Son jazz tendance'}]}},
  {id:'pub8',sem:'S2',date:'11/03',day:11,mo:2,yr:2026,plat:'insta',fmt:'Reel',title:'Restaurant Cor\u00E9en \u2014 Reel lifestyle',son:'Son fun cor\u00E9en trending',heure:'12h00',tags:'#koreanfood #girlsnight',src:'Contenu pr\u00EAt',done:false,launch:false,stats:{v:0,l:0,c:0,s:0,sh:0},script:{title:'Reel Resto Cor\u00E9en',shots:[{n:1,d:'Meilleurs clips restaurant'},{n:2,d:'Format : 20-30s'},{n:3,d:'Focus : ambiance + food + outfits'}]}},
  {id:'pub9',sem:'S2',date:'11/03',day:11,mo:2,yr:2026,plat:'tiktok',fmt:'TikTok',title:'Bowling + Anniversaire copain \u2014 look chic VS bowling',son:'Son humour trending',heure:'18h00',tags:'#birthday #bowling',src:'Bowling anniversaire',done:false,launch:false,stats:{v:0,l:0,c:0,s:0,sh:0},script:{title:'TikTok Bowling Humour',shots:[{n:1,d:'Utilise le script t\u00E2che p11'},{n:2,d:'Joue sur le contraste chic/bowling'},{n:3,d:'Son humour du moment'}]}},
  {id:'pub10',sem:'S2',date:'12/03',day:12,mo:2,yr:2026,plat:'insta',fmt:'Carousel',title:'Carousel Tenue 3 \u2014 Tour Eiffel / Rues de Paris',son:'\u2014',heure:'12h00',tags:'#carousel #toureiffel',src:'Shooting 8 mars',done:false,launch:false,stats:{v:0,l:0,c:0,s:0,sh:0},script:{title:'Carousel Tenue 3',shots:[{n:1,d:'Slide 1 : walking Tour centr\u00E9e'},{n:2,d:'Slide 2 : profil \u00E9ditorial'},{n:3,d:'Slide 3 : face souriante'},{n:4,d:'Slide 4 : rue haussmannienne'},{n:5,d:'Slide 5 : d\u00E9tail chaussure'},{n:6,d:'Slide 6 : moment fun'},{n:7,d:'Slide 7 : golden hour'},{n:8,d:'Slide 8 : vote'}]}},
  {id:'pub11',sem:'S2',date:'12/03',day:12,mo:2,yr:2026,plat:'tiktok',fmt:'TikTok',title:'Collab maquillage copine MUA \u2014 transformation',son:'Son transformation trending',heure:'18h00',tags:'#makeupartist #transformation',src:'Collab MUA',done:false,launch:false,stats:{v:0,l:0,c:0,s:0,sh:0},script:{title:'TikTok Transformation MUA',shots:[{n:1,d:'Utilise le script t\u00E2che p4'},{n:2,d:'Format avant/apr\u00E8s avec transition miroir'},{n:3,d:'Tag obligatoire @copine_mua'}]}}
];

var FW_WEEKS = [
  {id:'w01',l:'S1 Mars',dt:'08/03'},{id:'w02',l:'S2 Mars',dt:'15/03'},{id:'w03',l:'S3 Mars',dt:'22/03'},{id:'w04',l:'S4 Mars',dt:'29/03'},
  {id:'w05',l:'S1 Avril',dt:'05/04'},{id:'w06',l:'S2 Avril',dt:'12/04'},{id:'w07',l:'S3 Avril',dt:'19/04'},{id:'w08',l:'S4 Avril',dt:'26/04'},
  {id:'w09',l:'S1 Mai',dt:'03/05'},{id:'w10',l:'S2 Mai',dt:'10/05'},{id:'w11',l:'S3 Mai',dt:'17/05'},{id:'w12',l:'S4 Mai',dt:'24/05'},
  {id:'w13',l:'S1 Juin',dt:'01/06'},{id:'w14',l:'S2 Juin',dt:'08/06'},{id:'w15',l:'S3 Juin',dt:'15/06'},{id:'w16',l:'S4 Juin',dt:'22/06'},
  {id:'w17',l:'S1 Juil.',dt:'06/07'},{id:'w18',l:'S2 Juil.',dt:'13/07'},{id:'w19',l:'S3 Juil.',dt:'20/07'},{id:'w20',l:'S4 Juil.',dt:'27/07'},
  {id:'w21',l:'S1 Ao\u00FBt',dt:'03/08'},{id:'w22',l:'S2 Ao\u00FBt',dt:'10/08'},{id:'w23',l:'S3 Ao\u00FBt',dt:'17/08'},{id:'w24',l:'S4 Ao\u00FBt',dt:'24/08'},
  {id:'w25',l:'S1 Sept.',dt:'07/09'},{id:'w26',l:'S2 Sept.',dt:'14/09'},{id:'w27',l:'S3 Sept.',dt:'21/09'},{id:'w28',l:'S4 Sept.',dt:'28/09'},
  {id:'w29',l:'S1 Oct.',dt:'05/10'},{id:'w30',l:'S2 Oct.',dt:'12/10'},{id:'w31',l:'S3 Oct.',dt:'19/10'},{id:'w32',l:'S4 Oct.',dt:'26/10'},
  {id:'w33',l:'S1 Nov.',dt:'02/11'},{id:'w34',l:'S2 Nov.',dt:'09/11'},{id:'w35',l:'S3 Nov.',dt:'16/11'},{id:'w36',l:'S4 Nov.',dt:'23/11'},
  {id:'w37',l:'S1 D\u00E9c.',dt:'07/12'},{id:'w38',l:'S2 D\u00E9c.',dt:'14/12'},{id:'w39',l:'S3 D\u00E9c.',dt:'21/12'}
];
var D_FW = FW_WEEKS.map(function(w) { return {id:w.id, l:w.l, dt:w.dt, ig:0, tt:0}; });

// ─── STATE ───
var PROD, PUBS, FW;
var fSem = 'all', fPlat = 'all';

// ─── SAVE / LOAD ───
function save() {
  cloudSave('prod2', PROD);
  cloudSave('pubs2', PUBS);
  cloudSave('fw2', FW);
}

async function load() {
  PROD = await cloudLoad('prod2', null);
  PUBS = await cloudLoad('pubs2', null);
  FW   = await cloudLoad('fw2', null);
  if (!PROD) PROD = JSON.parse(JSON.stringify(D_PROD));
  if (!PUBS) PUBS = JSON.parse(JSON.stringify(D_PUBS));
  if (!FW) FW = JSON.parse(JSON.stringify(D_FW));
}

// ─── INIT ───
async function initApp() {
  initSupabase();
  await load();
  await loadIgProfile();
  await loadFeedData();
  await loadEvents();
  renderAll();
}

function renderAll() {
  renderKPIs();
  renderProd();
  buildFilters();
  renderPlanning();
  renderCalendar();
  renderFeed();
  renderHighlights();
}

// ─── TABS ───
function setTab(id, btn) {
  document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.bnt').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('tab-' + id).classList.add('active');
  btn.classList.add('active');
  if (id === 'analytics') renderAnalytics();
  if (id === 'planning') renderCalendar();
  if (id === 'followers') renderFollowers();
}

// ─── KPIs ───
function renderKPIs() {
  var posted = PUBS.filter(function(p) { return p.done; }).length;
  var ws = PUBS.filter(function(p) { return p.done && p.stats.v > 0; });
  var tv = ws.reduce(function(s, p) { return s + p.stats.v; }, 0);
  var avgE = ws.length ? (ws.reduce(function(s, p) { return s + parseFloat(eng(p)); }, 0) / ws.length).toFixed(1) : null;
  var igLast = FW.filter(function(f) { return f.ig > 0; });
  var ttLast = FW.filter(function(f) { return f.tt > 0; });
  var igC = igLast.length ? igLast[igLast.length - 1].ig : 0;
  var ttC = ttLast.length ? ttLast[ttLast.length - 1].tt : 0;
  var pd = PROD.filter(function(p) { return p.done; }).length;

  document.getElementById('kpi-row').innerHTML = [
    {l:'Productions', v:pd + '/' + PROD.length, c:'#F59E0B'},
    {l:'Posts publi\u00E9s', v:posted + '/' + PUBS.length, c:'#FF2D7A'},
    {l:'Vues totales', v:tv > 0 ? tv.toLocaleString('fr-FR') : '\u2014', c:'#06B6D4'},
    {l:'Engagement moy.', v:avgE ? avgE + '%' : '\u2014', c:'#7C3AED'},
    {l:'Instagram', v:igC > 0 ? igC.toLocaleString('fr-FR') : '\u2014', c:'#C13584'},
    {l:'TikTok', v:ttC > 0 ? ttC.toLocaleString('fr-FR') : '\u2014', c:'#FF004F'}
  ].map(function(k) {
    return '<div class="kpi"><div class="kl">' + k.l + '</div><div class="kv" style="color:' + k.c + '">' + k.v + '</div></div>';
  }).join('');
}

// ─── Auto-login on page load ───
autoLogin();
