/* Paypers — swipeable biomedical paper discovery */

const API_BASE = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

const HOT_TOPICS = [
  'Cancer Immunotherapy', 'CRISPR / Gene Editing', "Alzheimer's Disease",
  'mRNA Vaccines', 'Microbiome', 'Stem Cells', 'Antibiotic Resistance',
  'Personalized Medicine', 'Neurodegeneration', 'Cardiovascular Disease',
  'Diabetes / Metabolism', 'Epigenetics', 'Autoimmune Disease',
  'Infectious Disease', 'Mental Health / Psychiatry',
];

const SUGGESTIONS = [
  'Cancer', 'Immunotherapy', 'CRISPR', 'Gene Therapy', 'Alzheimer', 'mRNA',
  'Vaccine', 'Microbiome', 'Gut', 'Stem Cell', 'Antibiotic', 'Resistance',
  'Epigenetics', 'Neuroscience', 'Cardiology', 'Diabetes', 'Metabolism',
  'Oncology', 'CAR-T', 'Checkpoint Inhibitor', 'Biomarker', 'Radiomics',
  'Neurodegeneration', 'Parkinson', 'Multiple Sclerosis', 'Autoimmune',
  'SARS-CoV-2', 'Long COVID', 'Mental Health', 'Depression', 'Anxiety',
  'Machine Learning', 'Deep Learning', 'Artificial Intelligence',
  'Single Cell', 'Proteomics', 'Genomics', 'Transcriptomics', 'Metabolomics',
  'Organoid', 'CRISPR-Cas9', 'Prime Editing', 'Base Editing',
  'Nanoparticle', 'Drug Delivery', 'Pharmacokinetics', 'Clinical Trial',
  'Meta-analysis', 'Systematic Review', 'Epidemiology', 'Public Health',
];

const BADGES = [
  { id: 'first_save', name: 'First Save', desc: 'Save your first paper', icon: '★', xp: 25 },
  { id: 'deep_dive', name: 'Deep Dive', desc: 'Save 10 papers', icon: '❖', xp: 75 },
  { id: 'explorer', name: 'Explorer', desc: 'Swipe 100 papers', icon: '✦', xp: 100 },
  { id: 'polyglot', name: 'Polyglot', desc: 'Papers in 5+ topics', icon: '⚛', xp: 150 },
  { id: 'night_owl', name: 'Night Owl', desc: 'Swipe after 10 PM', icon: '☾', xp: 50 },
  { id: 'speed_reader', name: 'Speed Reader', desc: 'Swipe 30 in one session', icon: '↯', xp: 100 },
  { id: 'collector', name: 'Collector', desc: 'Save 25 papers', icon: '◆', xp: 200 },
  { id: 'scholar', name: 'Scholar', desc: 'Swipe 500 papers', icon: '◈', xp: 300 },
];

/* ═══ State ═══ */
const state = {
  keywords: [],
  saved: [],
  queue: [],
  history: new Set(),
  cursorMark: null,
  isLoading: false,
  activeTab: 'swipe',
  fetchMode: 'exploit',
  stats: {
    totalSwiped: 0, totalSaved: 0, todayDate: '', todaySwiped: 0,
    sessionSwiped: 0, xp: 0, level: 1, badges: [],
    lastWeekDigest: '', lastSeenKeywords: {},
    discoveredKeywords: {},
  },
  cardViewStartTime: 0,
  darkMode: false,
};
try {
  const s = localStorage.getItem('paypersState');
  if (s) {
    const parsed = JSON.parse(s);
    Object.assign(state, parsed);
    state.history = new Set(parsed.history || []);
  }
} catch (e) {}
function saveState() {
  const { queue, cursorMark, isLoading, history, ...rest } = state;
  const flat = { ...rest, history: [...history] };
  try { localStorage.setItem('paypersState', JSON.stringify(flat)); } catch (e) {}
}

/* ═══ DOM refs ═══ */
const els = {
  onboarding: document.getElementById('onboarding'),
  main: document.getElementById('main'),
  keywordInput: document.getElementById('keyword-input'),
  addKeywordBtn: document.getElementById('add-keyword'),
  selectedKeywords: document.getElementById('selected-keywords'),
  keywordLimit: document.getElementById('keyword-limit'),
  topicPills: document.getElementById('topic-pills'),
  startBtn: document.getElementById('start-btn'),
  cardStack: document.getElementById('card-stack'),
  emptyState: document.getElementById('empty-state'),
  savedList: document.getElementById('saved-list'),
  savedSubtitle: document.getElementById('saved-subtitle'),
  savedBadge: document.getElementById('saved-badge'),
  tabBtnSwipe: document.getElementById('tab-btn-swipe'),
  tabBtnSaved: document.getElementById('tab-btn-saved'),
  tabSwipe: document.getElementById('tab-swipe'),
  tabSaved: document.getElementById('tab-saved'),
  statsBar: document.getElementById('stats-bar'),
  darkToggle: document.getElementById('dark-toggle'),
  savedFilter: document.getElementById('saved-filter'),
  digestBanner: document.getElementById('digest-banner'),
};

/* ═══ Helpers ═══ */
const norm = (str) => str.trim().toLowerCase();
function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function truncateAuthors(authorsStr) {
  if (!authorsStr) return '';
  const parts = authorsStr.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length <= 6) return escapeHtml(authorsStr);
  return escapeHtml(parts.slice(0, 6).join(', ')) + '…';
}
function daysBetween(d1, d2) {
  return Math.floor((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24));
}

/* ═══ Paper keyword extraction from Europe PMC ═══ */
function extractPaperKeywords(raw) {
  const tags = [];
  // Author keywords
  const kwList = raw.keywordList?.keyword || [];
  kwList.forEach(kw => { if (kw && kw.trim()) tags.push({ text: kw.trim(), type: 'keyword' }); });
  // MeSH terms
  const meshList = raw.meshHeadingList?.meshHeading || [];
  meshList.forEach(m => {
    if (m.descriptorName) {
      tags.push({ text: m.descriptorName, type: m.majorTopic_YN === 'Y' ? 'mesh-major' : 'mesh' });
    }
  });
  // Deduplicate by normalized text, prefer mesh-major > mesh > keyword
  const seen = new Set();
  const deduped = [];
  const priority = { 'mesh-major': 0, 'mesh': 1, 'keyword': 2 };
  const sorted = tags.sort((a, b) => (priority[a.type] || 9) - (priority[b.type] || 9));
  sorted.forEach(t => {
    const n = norm(t.text);
    if (!seen.has(n)) { seen.add(n); deduped.push(t); }
  });
  // Cap at 12 tags, prioritize mesh-major
  return deduped.slice(0, 12);
}

/* ═══ Keyword matching ═══ */
function keywordMatchType(keyword, paper) {
  const words = norm(keyword).split(/[\s\-']+/).filter(w => w.length >= 3);
  const titleNorm = norm(paper.title);
  const absNorm = norm(paper.abstract);
  const fullPhrase = norm(keyword);
  if (titleNorm.includes(fullPhrase)) return 'title';
  if (absNorm.includes(fullPhrase)) return 'abstract';
  if (words.length > 0) {
    const titleHits = words.filter(w => titleNorm.includes(w)).length;
    if (titleHits >= Math.ceil(words.length / 2)) return 'title';
    const absHits = words.filter(w => absNorm.includes(w)).length;
    if (absHits >= Math.ceil(words.length / 2)) return 'abstract';
    if (titleHits > 0 || absHits > 0) return 'abstract';
  }
  return null;
}

/* ═══ SCORING (multi-factor + time decay + diversity) ═══ */
function applyTimeDecay() {
  const today = new Date().toISOString().split('T')[0];
  state.keywords.forEach(k => {
    if (k.lastAction) {
      const days = daysBetween(k.lastAction, today);
      if (days > 0) k.score *= Math.pow(0.93, days);
    }
    k.score = Math.max(-10, Math.min(50, k.score));
  });
  // Also decay discovered MeSH keywords
  const dk = state.stats.discoveredKeywords;
  Object.keys(dk).forEach(key => {
    const entry = dk[key];
    if (entry.lastAction) {
      const days = daysBetween(entry.lastAction, today);
      if (days > 0) entry.score *= Math.pow(0.93, days);
    }
    entry.score = Math.max(-10, Math.min(30, entry.score));
  });
  // Clean up stale low-score discovered keywords
  Object.keys(dk).forEach(key => {
    if (Math.abs(dk[key].score) < 0.5) delete dk[key];
  });
}

function updateScores(paper, direction, timeOnCard) {
  const isSave = direction === 'right';
  applyTimeDecay();
  const today = new Date().toISOString().split('T')[0];

  // Update onboarding keywords (higher weight — main signal)
  state.keywords.forEach(k => {
    const match = keywordMatchType(k.text, paper);
    let delta = 0;
    if (isSave) {
      if (match === 'title') delta = 3.0;
      else if (match === 'abstract') delta = 1.5;
      else delta = 0.3;
      if (timeOnCard > 5000) delta += 1.0;
    } else {
      if (match === 'title') delta = -1.0;
      else if (match === 'abstract') delta = -0.4;
      if (timeOnCard > 5000) delta += -0.2;
    }
    k.score += delta;
    k.score = Math.max(-10, Math.min(50, k.score));
    k.lastAction = today;
    state.stats.lastSeenKeywords[k.text] = today;
  });

  // Update ALL MeSH/author keywords from the paper (0.5× weight vs onboarding)
  const dk = state.stats.discoveredKeywords;
  (paper.paperKeywords || []).forEach(kw => {
    const key = norm(kw.text);
    if (!dk[key]) dk[key] = { score: 0, lastAction: today };
    let delta = 0;
    if (isSave) {
      // Paper was saved — all its keywords get positive signal
      if (kw.type === 'mesh-major') delta = 1.2;
      else if (kw.type === 'mesh') delta = 0.5;
      else delta = 0.3;
      if (timeOnCard > 5000) delta += 0.5;
    } else {
      // Paper was skipped — mild negative for its keywords
      if (kw.type === 'mesh-major') delta = -0.3;
      else delta = -0.1;
    }
    dk[key].score += delta;
    dk[key].score = Math.max(-10, Math.min(30, dk[key].score));
    dk[key].lastAction = today;
  });

  // Auto-drop negative onboarding keywords
  const toRemove = state.keywords.filter(k => k.score < -5);
  if (toRemove.length) {
    state.keywords = state.keywords.filter(k => k.score >= -5);
    renderKeywordTags();
  }
}

/* 70/20/10 fetch mode with diversity throttle */
let _fetchCounter = 0;
function pickFetchMode() {
  _fetchCounter++;
  const r = _fetchCounter % 10;
  if (r < 7) return 'exploit';
  if (r < 9) return 'related';
  return 'explore';
}

function buildQuery() {
  const mode = pickFetchMode();
  state.fetchMode = mode;
  const sorted = [...state.keywords].sort((a, b) => b.score - a.score);
  // Novelty boost: keywords not seen in 20+ swipes get 1.5x weight
  const noveltyScore = (k) => {
    const lastSeen = state.stats.lastSeenKeywords[k.text];
    if (!lastSeen) return k.score * 1.5;
    if (daysBetween(lastSeen, new Date().toISOString().split('T')[0]) > 3) return k.score * 1.3;
    return k.score;
  };
  const weighted = sorted.map(k => ({ ...k, effective: noveltyScore(k) }));
  weighted.sort((a, b) => b.effective - a.effective);

  let pool = [];
  if (mode === 'exploit') {
    pool = weighted.slice(0, Math.min(2, weighted.length)).map(k => k.text);
  } else if (mode === 'related') {
    pool = weighted.slice(2, Math.min(5, weighted.length)).map(k => k.text);
    if (pool.length === 0) pool = weighted.slice(0, 2).map(k => k.text);
  } else {
    pool = state.keywords.map(k => k.text);
  }
  if (pool.length === 0) pool = state.keywords.map(k => k.text);
  // Diversity throttle: if top keyword >40% of queries, force an explore
  if (mode === 'exploit' && pool.length >= 2 && _fetchCounter % 4 === 0) {
    const all = state.keywords.map(k => k.text);
    if (all.length > pool.length) pool = all.sort(() => Math.random() - 0.5).slice(0, 3);
  }
  return pool.map(t => `"${t}"`).join(' OR ');
}

/* ═══ API ═══ */
async function fetchPapers() {
  if (state.isLoading) return;
  state.isLoading = true;
  els.emptyState?.classList.remove('hidden');
  const emptyMsg = document.getElementById('empty-state-msg');
  const retryBtn = document.getElementById('retry-btn');
  if (retryBtn) retryBtn.classList.add('hidden');
  if (emptyMsg) emptyMsg.textContent = 'Loading more papers…';

  const query = buildQuery();
  const cursorParam = state.cursorMark ? `&cursorMark=${encodeURIComponent(state.cursorMark)}` : '';
  const url = `${API_BASE}?query=${encodeURIComponent(query)}&format=json&pageSize=10&sort=CITED+desc&resultType=core${cursorParam}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    const results = data.resultList?.result || [];
    const seen = state.history;
    const fresh = results
      .filter(r => !seen.has(r.id))
      .map(r => {
        const rawAbstract = r.abstractText || '';
        const cleanAbstract = stripHtml(rawAbstract).trim();
        const rawTitle = r.title || 'Untitled';
        const cleanTitle = stripHtml(rawTitle).trim();
        return {
          id: r.id,
          title: cleanTitle,
          abstract: cleanAbstract || 'No abstract available.',
          authors: r.authorString || 'Unknown authors',
          year: r.pubYear || '',
          journal: r.journalTitle || '',
          doi: r.doi,
          pmid: r.pmid,
          paperKeywords: extractPaperKeywords(r),
        };
      });
    state.cursorMark = data.nextCursorMark || null;
    if (fresh.length) {
      state.queue.push(...fresh);
      fresh.forEach(p => state.history.add(p.id));
      renderTopCard();
    } else if (state.cursorMark) {
      state.isLoading = false;
      return fetchPapers();
    }
  } catch (err) {
    console.error(err);
    if (emptyMsg) emptyMsg.textContent = 'Failed to load. Check your connection.';
    if (retryBtn) { retryBtn.classList.remove('hidden'); retryBtn.onclick = () => { state.isLoading = false; fetchPapers(); }; }
  } finally {
    state.isLoading = false;
    if (state.queue.length > 0) els.emptyState?.classList.add('hidden');
  }
}

async function fetchSimilar(paper) {
  if (!paper.pmid && !paper.doi) return [];
  const id = paper.pmid ? `EXT_ID:${paper.pmid}` : `DOI:${paper.doi}`;
  try {
    const res = await fetch(`${API_BASE}?query=${encodeURIComponent(id)}&format=json&pageSize=6&sort=RELEVANCE&resultType=core`);
    if (!res.ok) return [];
    const data = await res.json();
    const results = (data.resultList?.result || []).filter(r => r.id !== paper.id);
    return results.filter(r => !state.history.has(r.id)).map(r => {
      const rawAbstract = r.abstractText || '';
      const cleanAbstract = stripHtml(rawAbstract).trim();
      return {
        id: r.id, title: stripHtml(r.title || 'Untitled').trim(),
        abstract: cleanAbstract || 'No abstract available.',
        authors: r.authorString || '', year: r.pubYear || '',
        journal: r.journalTitle || '', doi: r.doi, pmid: r.pmid,
        paperKeywords: extractPaperKeywords(r),
      };
    });
  } catch (e) {
    console.error('Failed to fetch similar papers:', e);
    return [];
  }
}

function ensureBuffer() {
  if (state.queue.length < 3 && !state.isLoading) fetchPapers();
}

/* ═══ Tabs ═══ */
function switchTab(tab) {
  state.activeTab = tab;
  els.tabBtnSwipe.classList.toggle('active', tab === 'swipe');
  els.tabBtnSaved.classList.toggle('active', tab === 'saved');
  els.tabSwipe.classList.toggle('active', tab === 'swipe');
  els.tabSaved.classList.toggle('active', tab === 'saved');
  if (tab === 'saved') renderSaved();
  if (tab === 'swipe') renderStats();
}

/* ═══ Card rendering ═══ */
function renderTopCard() {
  const existing = els.cardStack.querySelectorAll('.paper-card');
  existing.forEach(c => c.remove());
  const paper = state.queue[0];
  if (!paper) { els.emptyState?.classList.remove('hidden'); ensureBuffer(); return; }
  els.emptyState?.classList.add('hidden');
  state.cardViewStartTime = Date.now();
  const card = createCardEl(paper);
  els.cardStack.appendChild(card);
  initSwipe(card, paper);
}

function createCardEl(paper) {
  const el = document.createElement('div');
  el.className = 'paper-card enter';
  el.dataset.id = paper.id;

  const doiLink = paper.doi ? `<a href="https://doi.org/${escapeHtml(paper.doi)}" target="_blank" rel="noopener">DOI</a>` : '';
  const pmidLink = paper.pmid ? `<a href="https://pubmed.ncbi.nlm.nih.gov/${escapeHtml(paper.pmid)}/" target="_blank" rel="noopener">PubMed</a>` : '';
  const divider = doiLink && pmidLink ? '<span class="divider">|</span>' : '';
  const shareUrl = paper.doi ? `https://doi.org/${paper.doi}` : (paper.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/` : '');
  const authors = truncateAuthors(paper.authors);

  // Paper's own keyword tags
  const kwList = paper.paperKeywords || [];
  const kwHtml = kwList.length
    ? `<div class="card-keywords">${kwList.map(kw => {
        const cls = kw.type === 'mesh-major' ? 'matched' : (kw.type === 'mesh' ? 'mesh' : '');
        return `<span class="card-keyword-tag ${cls}" data-kw="${escapeHtml(kw.text)}">${escapeHtml(kw.text)}</span>`;
      }).join('')}</div>`
    : '';

  el.innerHTML = `
    <div class="card-header">
      <span class="card-journal">${escapeHtml(paper.journal)}</span>
      <span class="card-year">${escapeHtml(String(paper.year))}</span>
    </div>
    <div class="card-title">${escapeHtml(paper.title)}</div>
    <div class="card-authors">${authors}</div>
    ${kwHtml}
    <div class="card-abstract">${escapeHtml(paper.abstract)}</div>
    <div class="card-footer">
      ${doiLink}${divider}${pmidLink}
      <button class="share-btn" data-url="${escapeHtml(shareUrl)}" title="Share this paper">⤴</button>
    </div>
    <div class="overlay-label nope">Skip</div>
    <div class="overlay-label like">Save</div>
  `;

  // Open footer links in new tabs (setPointerCapture in swipe steals clicks)
  el.querySelectorAll('.card-footer a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open(link.href, '_blank', 'noopener');
      e.preventDefault();
    });
  });

  // Share button — clipboard with execCommand fallback for non-HTTPS
  const shareBtn = el.querySelector('.share-btn');
  shareBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const url = shareBtn.dataset.url;
    if (!url) return;
    if (navigator.share) {
      navigator.share({ title: paper.title, url }).catch(() => {});
      return;
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        shareBtn.textContent = '✓ Copied!';
        setTimeout(() => { shareBtn.textContent = '⤴'; }, 2000);
      }).catch(() => fallbackCopy(shareBtn, url));
    } else {
      fallbackCopy(shareBtn, url);
    }
  });

  function fallbackCopy(btn, text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      btn.textContent = '✓ Copied!';
      setTimeout(() => { btn.textContent = '⤴'; }, 2000);
    } catch (_) {
      btn.textContent = '✗ Failed';
      setTimeout(() => { btn.textContent = '⤴'; }, 2000);
    }
  }

  // Click keyword to add to search
  el.querySelectorAll('.card-keyword-tag').forEach(tag => {
    tag.addEventListener('click', (e) => {
      e.stopPropagation();
      const kw = tag.dataset.kw;
      if (kw && state.keywords.length < 5 && !state.keywords.some(k => norm(k.text) === norm(kw))) {
        state.keywords.push({ text: kw, score: 5, lastAction: new Date().toISOString().split('T')[0] });
        renderKeywordTags();
        showToast(`Added "${kw}" to your keywords`);
      }
    });
  });

  return el;
}

/* ═══ Swipe handling ═══ */
function initSwipe(card, paper) {
  let startX = 0, currentX = 0, isDragging = false, decided = false;

  const onDown = (x) => { startX = x; isDragging = true; };
  const onMove = (x) => {
    if (!isDragging || decided) return;
    currentX = x - startX;
    card.style.transform = `translateX(${currentX}px) rotate(${currentX * 0.05}deg)`;
    const ratio = Math.max(-1, Math.min(1, currentX / (card.offsetWidth / 2)));
    card.querySelector('.overlay-label.nope').style.opacity = ratio < 0 ? Math.abs(ratio) : 0;
    card.querySelector('.overlay-label.like').style.opacity = ratio > 0 ? ratio : 0;
  };
  const onUp = () => {
    if (!isDragging || decided) return;
    isDragging = false;
    const threshold = card.offsetWidth * 0.3;
    if (currentX > threshold) { decided = true; animateSwipe(card, paper, 'right'); }
    else if (currentX < -threshold) { decided = true; animateSwipe(card, paper, 'left'); }
    else {
      card.style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
      card.style.transform = 'translateX(0) rotate(0)';
      card.querySelector('.overlay-label.nope').style.opacity = 0;
      card.querySelector('.overlay-label.like').style.opacity = 0;
      setTimeout(() => { card.style.transition = ''; }, 300);
    }
    currentX = 0;
  };
  card.addEventListener('pointerdown', (e) => {
    // Don't capture if clicking a link, button, or the card footer
    if (e.target.closest('a') || e.target.closest('button') || e.target.closest('.card-footer')) return;
    card.setPointerCapture(e.pointerId); onDown(e.clientX);
  });
  card.addEventListener('pointermove', (e) => onMove(e.clientX));
  card.addEventListener('pointerup', onUp);
  card.addEventListener('pointercancel', onUp);

  const keyHandler = (e) => {
    if (decided) return;
    if (e.key === 'ArrowRight') { decided = true; window.removeEventListener('keydown', keyHandler); animateSwipe(card, paper, 'right'); }
    else if (e.key === 'ArrowLeft') { decided = true; window.removeEventListener('keydown', keyHandler); animateSwipe(card, paper, 'left'); }
  };
  window.addEventListener('keydown', keyHandler);
}

function animateSwipe(card, paper, direction) {
  card.classList.add(direction === 'right' ? 'swipe-right' : 'swipe-left');
  setTimeout(() => handleDecision(direction, paper), 420);
}

function handleDecision(direction, paper) {
  const timeOnCard = Date.now() - (state.cardViewStartTime || Date.now());
  state.history.add(paper.id);
  updateScores(paper, direction, timeOnCard);
  // Stats tracking
  state.stats.totalSwiped++;
  const today = new Date().toISOString().split('T')[0];
  if (state.stats.todayDate !== today) { state.stats.todayDate = today; state.stats.todaySwiped = 0; }
  state.stats.todaySwiped++;
  state.stats.sessionSwiped++;
  state.stats.xp += 1;
  checkLevelUp();
  checkBadges();

  if (direction === 'right') {
    state.stats.totalSaved++;
    state.stats.xp += 4;
    checkLevelUp();
    if (!state.saved.find(s => s.id === paper.id)) state.saved.push(paper);
  }
  if (state.queue.length > 0 && state.queue[0].id === paper.id) state.queue.shift();
  else { const idx = state.queue.findIndex(p => p.id === paper.id); if (idx !== -1) state.queue.splice(idx, 1); }
  ensureBuffer();
  renderTopCard();
  renderStats();
  saveState();
}

/* ═══ Stats, levels, badges ═══ */
function checkLevelUp() {
  const newLevel = Math.floor(state.stats.xp / 50) + 1;
  if (newLevel > state.stats.level) {
    state.stats.level = newLevel;
    showToast(`Level ${newLevel}! Keep discovering.`);
  }
}

function checkBadges() {
  BADGES.forEach(badge => {
    if (state.stats.badges.includes(badge.id)) return;
    let earned = false;
    const s = state.stats;
    if (badge.id === 'first_save' && s.totalSaved >= 1) earned = true;
    if (badge.id === 'deep_dive' && s.totalSaved >= 10) earned = true;
    if (badge.id === 'explorer' && s.totalSwiped >= 100) earned = true;
    if (badge.id === 'polyglot') {
      const uniqueTopics = new Set(state.saved.map(p => p.journal).filter(Boolean));
      if (uniqueTopics.size >= 5) earned = true;
    }
    if (badge.id === 'night_owl') { const h = new Date().getHours(); if (h >= 22 || h < 2) earned = true; }
    if (badge.id === 'speed_reader' && s.sessionSwiped >= 30) earned = true;
    if (badge.id === 'collector' && s.totalSaved >= 25) earned = true;
    if (badge.id === 'scholar' && s.totalSwiped >= 500) earned = true;
    if (earned) {
      state.stats.badges.push(badge.id);
      state.stats.xp += badge.xp;
      showBadgePopup(badge);
      checkLevelUp();
    }
  });
}

function renderStats() {
  if (!els.statsBar) return;
  const s = state.stats;
  const earnedMap = new Set(s.badges);
  const earnedCount = s.badges.length;
  els.statsBar.innerHTML = `
    <span>Swiped: <strong>${s.totalSwiped}</strong></span>
    <span>Saved: <strong>${s.totalSaved}</strong></span>
    <span>Lv.<strong>${s.level}</strong></span>
    <button id="badges-btn" class="badges-btn" title="Badges">🏆 ${earnedCount}/${BADGES.length}</button>
  `;
  document.getElementById('badges-btn')?.addEventListener('click', showBadgesModal);
}

function showBadgePopup(badge) {
  const overlay = document.createElement('div');
  overlay.className = 'badge-popup-overlay';
  overlay.innerHTML = `
    <div class="badge-popup">
      <div class="badge-popup-icon">${badge.icon}</div>
      <h2>Badge Earned!</h2>
      <div class="badge-popup-name">${badge.name}</div>
      <p class="badge-popup-desc">${badge.desc}</p>
      <p class="badge-popup-xp">+${badge.xp} XP</p>
      <button class="badge-popup-dismiss">Sweet!</button>
    </div>
  `;
  document.getElementById('app').appendChild(overlay);
  overlay.querySelector('.badge-popup-dismiss').addEventListener('click', () => {
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 300);
  });
}

function showBadgesModal() {
  const existing = document.querySelector('.badges-modal-overlay');
  if (existing) { existing.remove(); return; }
  const earnedMap = new Set(state.stats.badges);
  const overlay = document.createElement('div');
  overlay.className = 'badges-modal-overlay';
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.innerHTML = `
    <div class="badges-modal">
      <div class="badges-modal-header">
        <h2>Badges</h2>
        <button class="badges-modal-close">✕</button>
      </div>
      <p class="badges-modal-sub">${state.stats.badges.length} / ${BADGES.length} earned</p>
      <div class="badges-modal-grid">
        ${BADGES.map(b => {
          const earned = earnedMap.has(b.id);
          return `
            <div class="badges-modal-item ${earned ? 'earned' : 'locked'}">
              <span class="badge-icon">${earned ? b.icon : '🔒'}</span>
              <div class="badge-info">
                <span class="badge-name">${b.name}</span>
                <span class="badge-desc">${b.desc}</span>
              </div>
              ${earned ? '<span class="badge-check">✓</span>' : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  document.getElementById('app').appendChild(overlay);
  overlay.querySelector('.badges-modal-close')?.addEventListener('click', () => overlay.remove());
}

function showResetPopup() {
  const overlay = document.createElement('div');
  overlay.className = 'badges-modal-overlay';
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.innerHTML = `
    <div class="badges-modal" style="max-width:340px; text-align:center;">
      <div class="badges-modal-header">
        <h2>Reset Everything?</h2>
        <button class="badges-modal-close">✕</button>
      </div>
      <div style="padding:20px;">
        <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:16px;">
          This will clear all your keywords, saved papers, scores, badges, and stats. You'll be taken back to the onboarding screen.
        </p>
        <div style="display:flex; gap:8px; justify-content:center;">
          <button class="reset-cancel-btn">Cancel</button>
          <button class="reset-confirm-btn">Reset</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('app').appendChild(overlay);
  overlay.querySelector('.badges-modal-close')?.addEventListener('click', () => overlay.remove());
  overlay.querySelector('.reset-cancel-btn')?.addEventListener('click', () => overlay.remove());
  overlay.querySelector('.reset-confirm-btn')?.addEventListener('click', () => {
    overlay.remove();
    resetToOnboarding();
  });
}

function resetToOnboarding() {
  state.keywords = [];
  state.saved = [];
  state.queue = [];
  state.history = new Set();
  state.cursorMark = null;
  state.isLoading = false;
  state.activeTab = 'swipe';
  state.stats = {
    totalSwiped: 0, totalSaved: 0, todayDate: '', todaySwiped: 0,
    sessionSwiped: 0, xp: 0, level: 1, badges: [],
    lastWeekDigest: '', lastSeenKeywords: {},
    discoveredKeywords: {},
  };
  _fetchCounter = 0;
  els.main.classList.remove('active');
  els.onboarding.classList.add('active');
  renderKeywordTags();
  renderStats();
  saveState();
}

function showToast(msg) {
  const existing = document.querySelector('.paypers-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'paypers-toast';
  toast.textContent = msg;
  document.getElementById('app').appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

/* ═══ Weekly digest ═══ */
function checkWeeklyDigest() {
  const today = new Date().toISOString().split('T')[0];
  if (!state.stats.lastWeekDigest || daysBetween(state.stats.lastWeekDigest, today) >= 7) {
    if (state.stats.totalSwiped > 0) {
      state.stats.lastWeekDigest = today;
      saveState();
      showDigest();
    }
  }
}

function showDigest() {
  if (!els.digestBanner) return;
  const s = state.stats;
  const topKeywords = [...state.keywords].sort((a, b) => b.score - a.score).slice(0, 3).map(k => k.text).join(', ') || 'none yet';
  els.digestBanner.innerHTML = `
    <div class="digest-card">
      <span class="digest-close" id="digest-close">✕</span>
      <h3>📊 Your Discovery Digest</h3>
      <p>You've swiped <strong>${s.totalSwiped}</strong> papers and saved <strong>${s.totalSaved}</strong>.</p>
      <p>Top interests: <strong>${topKeywords}</strong></p>
      <p>Level ${s.level} • ${s.badges.length} badges earned</p>
      <p style="font-size:0.8rem; color:var(--text-muted);">Keep swiping to discover more tailored papers.</p>
    </div>
  `;
  els.digestBanner.classList.remove('hidden');
  document.getElementById('digest-close')?.addEventListener('click', () => els.digestBanner.classList.add('hidden'));
}

/* ═══ Saved tab ═══ */
function renderSaved() {
  els.savedBadge.textContent = state.saved.length;
  els.savedBadge.style.display = state.saved.length ? 'block' : 'none';
  els.savedList.innerHTML = '';
  document.getElementById('undo-save-btn')?.classList.toggle('hidden', state.saved.length === 0);
  els.savedFilter?.classList.toggle('hidden', state.saved.length === 0);

  if (!state.saved.length) {
    els.savedSubtitle.textContent = 'No papers saved yet.';
    return;
  }
  els.savedSubtitle.textContent = `${state.saved.length} paper${state.saved.length !== 1 ? 's' : ''} saved`;

  const filterText = els.savedFilter?.value?.toLowerCase() || '';
  const filtered = filterText
    ? [...state.saved].filter(p =>
        p.title.toLowerCase().includes(filterText) ||
        p.abstract.toLowerCase().includes(filterText) ||
        (p.paperKeywords || []).some(kw => kw.text.toLowerCase().includes(filterText)))
    : [...state.saved];

  // Scoreboard — onboarding keywords first (highest weight), then top discovered MeSH
  const scoreboard = document.createElement('div');
  scoreboard.className = 'scoreboard';
  const sortedKws = [...state.keywords].sort((a, b) => b.score - a.score);
  const dk = state.stats.discoveredKeywords;
  const discoveredList = Object.entries(dk)
    .map(([text, entry]) => ({ text, score: entry.score, discovered: true }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
  scoreboard.innerHTML = `
    <div class="scoreboard-title">Keyword Scores</div>
    ${sortedKws.length ? `<div class="scoreboard-section-label">Your Keywords</div>
    <div class="scoreboard-grid">
      ${sortedKws.map(k => `
        <div class="scoreboard-item primary">
          <span class="sb-keyword">${escapeHtml(k.text)}</span>
          <span class="sb-score ${k.score > 0 ? 'pos' : k.score < 0 ? 'neg' : ''}">${k.score > 0 ? '+' : ''}${k.score.toFixed(1)}</span>
        </div>
      `).join('')}
    </div>` : ''}
    ${discoveredList.length ? `<div class="scoreboard-section-label">Discovered Topics</div>
    <div class="scoreboard-grid">
      ${discoveredList.map(k => `
        <div class="scoreboard-item">
          <span class="sb-keyword">${escapeHtml(k.text)}</span>
          <span class="sb-score ${k.score > 0 ? 'pos' : k.score < 0 ? 'neg' : ''}">${k.score > 0 ? '+' : ''}${k.score.toFixed(1)}</span>
        </div>
      `).join('')}
    </div>` : ''}
  `;
  els.savedList.appendChild(scoreboard);

  if (filterText && !filtered.length) {
    els.savedList.innerHTML += '<p style="text-align:center; color:var(--text-muted); padding:2rem;">No saved papers match your filter.</p>';
  }

  filtered.reverse().forEach(p => {
    const item = document.createElement('div');
    item.className = 'saved-item';
    const link = p.pmid
      ? `https://pubmed.ncbi.nlm.nih.gov/${escapeHtml(p.pmid)}/`
      : (p.doi ? `https://doi.org/${escapeHtml(p.doi)}` : '#');

    const kwList = p.paperKeywords || [];
    const kwHtml = kwList.length
      ? `<div class="card-keywords" style="margin-top:8px;">${kwList.map(kw => {
          const cls = kw.type === 'mesh-major' ? 'matched' : (kw.type === 'mesh' ? 'mesh' : '');
          return `<span class="card-keyword-tag ${cls}">${escapeHtml(kw.text)}</span>`;
        }).join('')}</div>`
      : '';

    item.innerHTML = `
      <h4>${escapeHtml(p.title)}</h4>
      <p>${truncateAuthors(p.authors)} • ${escapeHtml(String(p.year))} • ${escapeHtml(p.journal)}</p>
      <div class="saved-links">
        <a href="${link}" target="_blank" rel="noopener">View on PubMed &rarr;</a>
        <button class="similar-btn" data-id="${p.id}">Find Similar</button>
      </div>
      ${kwHtml}
    `;
    // Similar papers button
    item.querySelector('.similar-btn')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const btn = e.target;
      btn.disabled = true;
      btn.textContent = 'Loading…';
      const similar = await fetchSimilar(p);
      if (similar.length) {
        similar.forEach(sp => state.history.add(sp.id));
        state.queue.push(...similar);
        ensureBuffer();
        renderTopCard();
        showToast(`Added ${similar.length} similar papers to your queue`);
      } else {
        showToast('No similar papers found');
      }
      btn.disabled = false;
      btn.textContent = 'Find Similar';
    });
    els.savedList.appendChild(item);
  });
}

/* ═══ Keyword suggestions (autocomplete) ═══ */
let suggestTimer = null;
function showSuggestions(query) {
  const existing = document.getElementById('suggestions-dropdown');
  if (existing) existing.remove();
  if (!query || query.trim().length < 2) return;
  const q = norm(query);
  const matches = SUGGESTIONS.filter(s => norm(s).includes(q) && !state.keywords.some(k => norm(k.text) === norm(s))).slice(0, 6);
  if (!matches.length) return;
  const dropdown = document.createElement('div');
  dropdown.id = 'suggestions-dropdown';
  dropdown.className = 'suggestions-dropdown';
  matches.forEach(m => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.textContent = m;
    item.addEventListener('click', () => {
      addKeyword(m);
      els.keywordInput.value = '';
      dropdown.remove();
      els.keywordInput.focus();
    });
    dropdown.appendChild(item);
  });
  els.keywordInput.parentElement.appendChild(dropdown);
}

/* ═══ Keyword tags ═══ */
function renderKeywordTags() {
  els.selectedKeywords.innerHTML = '';
  state.keywords.forEach((k, i) => {
    const tag = document.createElement('span');
    tag.className = 'keyword-tag';
    tag.innerHTML = `${escapeHtml(k.text)} <button data-idx="${i}">&times;</button>`;
    tag.querySelector('button').addEventListener('click', () => removeKeyword(i));
    els.selectedKeywords.appendChild(tag);
  });
  els.keywordLimit.classList.toggle('hidden', state.keywords.length < 5);
  els.startBtn.disabled = state.keywords.length === 0;
}
function removeKeyword(idx) { state.keywords.splice(idx, 1); renderKeywordTags(); }
function addKeyword(text) {
  const t = text.trim();
  if (!t) return;
  if (state.keywords.length >= 5) return;
  if (state.keywords.some(k => norm(k.text) === norm(t))) return;
  state.keywords.push({ text: t, score: 0 });
  renderKeywordTags();
}

/* ═══ Dark mode ═══ */
function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : '');
  if (els.darkToggle) els.darkToggle.textContent = state.darkMode ? '☀' : '☾';
  saveState();
}
function applyDarkMode() {
  document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : '');
  if (els.darkToggle) els.darkToggle.textContent = state.darkMode ? '☀' : '☾';
}

/* ═══ Init ═══ */
function init() {
  HOT_TOPICS.forEach(topic => {
    const btn = document.createElement('button');
    btn.className = 'pill';
    btn.textContent = topic;
    btn.addEventListener('click', () => {
      if (state.keywords.some(k => norm(k.text) === norm(topic))) return;
      if (state.keywords.length >= 5) return;
      addKeyword(topic);
      btn.classList.add('selected');
      btn.disabled = true;
    });
    els.topicPills.appendChild(btn);
  });

  els.addKeywordBtn.addEventListener('click', () => { addKeyword(els.keywordInput.value); els.keywordInput.value = ''; els.keywordInput.focus(); });
  els.keywordInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addKeyword(els.keywordInput.value); els.keywordInput.value = ''; }
    if (e.key === 'Escape') { document.getElementById('suggestions-dropdown')?.remove(); }
  });
  els.keywordInput.addEventListener('input', () => {
    clearTimeout(suggestTimer);
    suggestTimer = setTimeout(() => showSuggestions(els.keywordInput.value), 250);
  });

  els.startBtn.addEventListener('click', () => {
    els.onboarding.classList.remove('active');
    els.main.classList.add('active');
    state.cursorMark = null;
    state.queue = [];
    state.saved = [];
    state.history = new Set();
    state.keywords.forEach(k => k.score = 0);
    state.stats.sessionSwiped = 0;
    state.stats.todayDate = new Date().toISOString().split('T')[0];
    state.stats.todaySwiped = 0;
    _fetchCounter = 0;
    saveState();
    fetchPapers();
    renderStats();
    checkWeeklyDigest();
  });

  els.tabBtnSwipe.addEventListener('click', () => switchTab('swipe'));
  els.tabBtnSaved.addEventListener('click', () => {
    if (state.activeTab === 'saved') {
      showResetPopup();
    } else {
      switchTab('saved');
    }
  });
  document.getElementById('undo-save-btn')?.addEventListener('click', () => { if (state.saved.length > 0) { state.saved.pop(); renderSaved(); } });

  els.savedFilter?.addEventListener('input', () => renderSaved());
  els.darkToggle?.addEventListener('click', toggleDarkMode);

  applyDarkMode();
  renderStats();
  checkWeeklyDigest();
  // If returning user has keywords, skip to main view and start fetching
  if (state.keywords.length > 0) {
    els.onboarding.classList.remove('active');
    els.main.classList.add('active');
    renderStats();
    fetchPapers();
  }
}

init();
