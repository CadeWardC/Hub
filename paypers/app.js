/* Paypers — swipeable biomedical paper discovery */

const API_BASE = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

const HOT_TOPICS = [
  'Cancer Immunotherapy',
  'CRISPR / Gene Editing',
  'Alzheimer\'s Disease',
  'mRNA Vaccines',
  'Microbiome',
  'Stem Cells',
  'Antibiotic Resistance',
  'Personalized Medicine',
  'Neurodegeneration',
  'Cardiovascular Disease',
  'Diabetes / Metabolism',
  'Epigenetics',
  'Autoimmune Disease',
  'Infectious Disease',
  'Mental Health / Psychiatry',
];

/* State */
const state = {
  keywords: [],         // { text, score }
  saved: [],            // paper objects
  queue: [],            // papers waiting to be swiped
  currentIndex: 0,      // index within queue
  page: 1,              // pagination for API
  isLoading: false,
  activeTab: 'swipe',   // 'swipe' | 'saved'
};

/* DOM refs */
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
};

/* Helpers */
const norm = (str) => str.trim().toLowerCase();

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

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

function removeKeyword(idx) {
  state.keywords.splice(idx, 1);
  renderKeywordTags();
}

function addKeyword(text) {
  const t = text.trim();
  if (!t) return;
  if (state.keywords.length >= 5) return;
  if (state.keywords.some((k) => norm(k.text) === norm(t))) return;
  state.keywords.push({ text: t, score: 0 });
  renderKeywordTags();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Find which user keywords appear in a paper */
function getMatchingKeywords(paper) {
  const haystack = norm(paper.title + ' ' + paper.abstract);
  return state.keywords
    .filter((k) => haystack.includes(norm(k.text)))
    .map((k) => k.text);
}

function buildQuery() {
  // Use positively scored keywords first; if none, use all keywords.
  const positive = state.keywords.filter((k) => k.score > 0).map((k) => k.text);
  const pool = positive.length ? positive : state.keywords.map((k) => k.text);
  // Wrap phrases in quotes for better matching.
  return pool.map((t) => `"${t}"`).join(' OR ');
}

/* API */
async function fetchPapers() {
  if (state.isLoading) return;
  state.isLoading = true;
  els.emptyState.classList.remove('hidden');

  const query = buildQuery();
  // resultType=core is required to get abstractText from Europe PMC
  const url = `${API_BASE}?query=${encodeURIComponent(query)}&format=json&pageSize=10&sort=CITED+desc&page=${state.page}&resultType=core`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    const results = data.resultList?.result || [];

    // Deduplicate against queue and saved.
    const seen = new Set([
      ...state.queue.map((p) => p.id),
      ...state.saved.map((p) => p.id),
    ]);
    const fresh = results
      .filter((r) => !seen.has(r.id))
      .map((r) => {
        const rawAbstract = r.abstractText || '';
        const cleanAbstract = stripHtml(rawAbstract).trim();
        return {
          id: r.id,
          title: r.title || 'Untitled',
          abstract: cleanAbstract || 'No abstract available.',
          authors: r.authorString || 'Unknown authors',
          year: r.pubYear || '',
          journal: r.journalTitle || '',
          doi: r.doi,
          pmid: r.pmid,
        };
      });

    if (fresh.length) {
      state.queue.push(...fresh);
      renderTopCard();
    } else {
      // No new results; advance page and try again once.
      state.page += 1;
      state.isLoading = false;
      return fetchPapers();
    }

    state.page += 1;
  } catch (err) {
    console.error(err);
    alert('Failed to fetch papers. Please check your connection and try again.');
  } finally {
    state.isLoading = false;
    if (state.queue.length > state.currentIndex) {
      els.emptyState.classList.add('hidden');
    }
  }
}

/* Tab switching */
function switchTab(tab) {
  state.activeTab = tab;

  // Update buttons
  els.tabBtnSwipe.classList.toggle('active', tab === 'swipe');
  els.tabBtnSaved.classList.toggle('active', tab === 'saved');

  // Update content
  els.tabSwipe.classList.toggle('active', tab === 'swipe');
  els.tabSaved.classList.toggle('active', tab === 'saved');
}

/* Card rendering & swiping */
function renderTopCard() {
  // Remove DOM cards that are behind the current one.
  const existing = els.cardStack.querySelectorAll('.paper-card');
  existing.forEach((c) => c.remove());

  const paper = state.queue[state.currentIndex];
  if (!paper) {
    els.emptyState.classList.remove('hidden');
    fetchPapers();
    return;
  }
  els.emptyState.classList.add('hidden');

  const card = createCardEl(paper);
  els.cardStack.appendChild(card);
  initSwipe(card, paper);
}

function createCardEl(paper) {
  const el = document.createElement('div');
  el.className = 'paper-card enter';
  el.dataset.id = paper.id;

  const doiLink = paper.doi
    ? `<a href="https://doi.org/${escapeHtml(paper.doi)}" target="_blank" rel="noopener">DOI</a>`
    : '';
  const pmidLink = paper.pmid
    ? `<a href="https://pubmed.ncbi.nlm.nih.gov/${escapeHtml(paper.pmid)}/" target="_blank" rel="noopener">PubMed</a>`
    : '';
  const divider = doiLink && pmidLink ? '<span class="divider">|</span>' : '';

  // Build keyword tags showing which user keywords match this paper
  const matches = getMatchingKeywords(paper);
  const keywordTagsHtml = matches.length
    ? `<div class="card-keywords">${matches.map((kw) => `<span class="card-keyword-tag matched">${escapeHtml(kw)}</span>`).join('')}</div>`
    : '';

  el.innerHTML = `
    <div class="card-header">
      <span class="card-journal">${escapeHtml(paper.journal)}</span>
      <span class="card-year">${escapeHtml(String(paper.year))}</span>
    </div>
    <div class="card-title">${escapeHtml(paper.title)}</div>
    <div class="card-authors">${escapeHtml(paper.authors)}</div>
    ${keywordTagsHtml}
    <div class="card-abstract">${escapeHtml(paper.abstract)}</div>
    <div class="card-footer">${doiLink}${divider}${pmidLink}</div>
    <div class="overlay-label nope">Skip</div>
    <div class="overlay-label like">Save</div>
  `;
  return el;
}

function initSwipe(card, paper) {
  let startX = 0;
  let currentX = 0;
  let isDragging = false;
  let decided = false;

  const onDown = (x) => { startX = x; isDragging = true; };
  const onMove = (x) => {
    if (!isDragging || decided) return;
    currentX = x - startX;
    const rotate = currentX * 0.05;
    card.style.transform = `translateX(${currentX}px) rotate(${rotate}deg)`;

    const ratio = Math.max(-1, Math.min(1, currentX / (card.offsetWidth / 2)));
    const nopeLabel = card.querySelector('.overlay-label.nope');
    const likeLabel = card.querySelector('.overlay-label.like');
    if (nopeLabel) nopeLabel.style.opacity = ratio < 0 ? Math.abs(ratio) : 0;
    if (likeLabel) likeLabel.style.opacity = ratio > 0 ? ratio : 0;
  };
  const onUp = () => {
    if (!isDragging || decided) return;
    isDragging = false;
    const threshold = card.offsetWidth * 0.3;
    if (currentX > threshold) {
      decided = true;
      animateSwipe(card, paper, 'right');
    } else if (currentX < -threshold) {
      decided = true;
      animateSwipe(card, paper, 'left');
    } else {
      card.style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
      card.style.transform = 'translateX(0) rotate(0)';
      const nopeLabel = card.querySelector('.overlay-label.nope');
      const likeLabel = card.querySelector('.overlay-label.like');
      if (nopeLabel) nopeLabel.style.opacity = 0;
      if (likeLabel) likeLabel.style.opacity = 0;
      setTimeout(() => { card.style.transition = ''; }, 300);
    }
    currentX = 0;
  };

  card.addEventListener('pointerdown', (e) => {
    card.setPointerCapture(e.pointerId);
    onDown(e.clientX);
  });
  card.addEventListener('pointermove', (e) => onMove(e.clientX));
  card.addEventListener('pointerup', onUp);
  card.addEventListener('pointercancel', onUp);

  // Keyboard support
  const keyHandler = (e) => {
    if (decided) return;
    if (e.key === 'ArrowRight') {
      decided = true;
      window.removeEventListener('keydown', keyHandler);
      animateSwipe(card, paper, 'right');
    } else if (e.key === 'ArrowLeft') {
      decided = true;
      window.removeEventListener('keydown', keyHandler);
      animateSwipe(card, paper, 'left');
    }
  };
  window.addEventListener('keydown', keyHandler);
}

function animateSwipe(card, paper, direction) {
  // Use CSS animation for smooth slide out
  card.classList.add(direction === 'right' ? 'swipe-right' : 'swipe-left');

  // After animation completes, handle the decision and render next card
  setTimeout(() => handleDecision(direction, paper), 420);
}

function handleDecision(direction, paper) {
  if (direction === 'right') {
    // Save paper
    if (!state.saved.find((s) => s.id === paper.id)) {
      state.saved.push(paper);
      renderSaved();
    }
    // Boost keywords found in title + abstract
    const haystack = norm(paper.title + ' ' + paper.abstract);
    state.keywords.forEach((k) => {
      if (haystack.includes(norm(k.text))) k.score += 1;
    });
  } else {
    // Slight negative for keywords found
    const haystack = norm(paper.title + ' ' + paper.abstract);
    state.keywords.forEach((k) => {
      if (haystack.includes(norm(k.text))) k.score -= 0.2;
    });
  }

  state.currentIndex += 1;

  // Fetch next batch when running low
  if (state.queue.length - state.currentIndex < 3) {
    fetchPapers();
  }

  renderTopCard();
}

/* Saved list */
function renderSaved() {
  els.savedBadge.textContent = state.saved.length;
  els.savedBadge.style.display = state.saved.length ? 'block' : 'none';
  els.savedList.innerHTML = '';

  if (!state.saved.length) {
    els.savedSubtitle.textContent = 'No papers saved yet.';
    return;
  }

  els.savedSubtitle.textContent = `${state.saved.length} paper${state.saved.length !== 1 ? 's' : ''} saved`;

  [...state.saved].reverse().forEach((p) => {
    const item = document.createElement('div');
    item.className = 'saved-item';
    const link = p.pmid
      ? `https://pubmed.ncbi.nlm.nih.gov/${escapeHtml(p.pmid)}/`
      : (p.doi ? `https://doi.org/${escapeHtml(p.doi)}` : '#');

    // Show matched keywords on saved items too
    const matches = getMatchingKeywords(p);
    const kwHtml = matches.length
      ? `<div class="card-keywords" style="margin-top:8px;">${matches.map((kw) => `<span class="card-keyword-tag matched">${escapeHtml(kw)}</span>`).join('')}</div>`
      : '';

    item.innerHTML = `
      <h4>${escapeHtml(p.title)}</h4>
      <p>${escapeHtml(p.authors)} • ${escapeHtml(String(p.year))} • ${escapeHtml(p.journal)}</p>
      <a href="${link}" target="_blank" rel="noopener">View on PubMed &rarr;</a>
      ${kwHtml}
    `;
    els.savedList.appendChild(item);
  });
}

/* Event wiring */
function init() {
  // Topic pills
  HOT_TOPICS.forEach((topic) => {
    const btn = document.createElement('button');
    btn.className = 'pill';
    btn.textContent = topic;
    btn.addEventListener('click', () => {
      if (state.keywords.some((k) => norm(k.text) === norm(topic))) return;
      if (state.keywords.length >= 5) return;
      addKeyword(topic);
      btn.classList.add('selected');
      btn.disabled = true;
    });
    els.topicPills.appendChild(btn);
  });

  // Keyword input
  els.addKeywordBtn.addEventListener('click', () => {
    addKeyword(els.keywordInput.value);
    els.keywordInput.value = '';
    els.keywordInput.focus();
  });
  els.keywordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword(els.keywordInput.value);
      els.keywordInput.value = '';
    }
  });

  // Start
  els.startBtn.addEventListener('click', () => {
    els.onboarding.classList.remove('active');
    els.main.classList.add('active');
    state.page = 1;
    fetchPapers();
  });

  // Bottom tabs
  els.tabBtnSwipe.addEventListener('click', () => switchTab('swipe'));
  els.tabBtnSaved.addEventListener('click', () => switchTab('saved'));
}

init();
