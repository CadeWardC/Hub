'use strict';

var editor = document.getElementById('editor');
var preview = document.getElementById('preview');
var wordCount = document.getElementById('word-count');
var docTitle = document.getElementById('doc-title');
var printRoot = document.getElementById('print-root');

var STORAGE_KEY = 'md2pdf:doc';
var TITLE_KEY = 'md2pdf:title';

var SAMPLE = [
    '# MD2PDF',
    '',
    'A tiny **Markdown viewer** that turns your notes into a clean PDF — entirely in your browser.',
    '',
    '## Features',
    '',
    '- Live preview as you type',
    '- Download the rendered view as a PDF',
    '- Works offline, no sign-up, nothing leaves your device',
    '',
    '### Formatting you can use',
    '',
    'You can write *italic*, **bold**, ~~strikethrough~~, and `inline code`.',
    '',
    '> Blockquotes are handy for callouts and pulled quotes.',
    '',
    '```js',
    'function greet(name) {',
    '  return `Hello, ${name}!`;',
    '}',
    '```',
    '',
    '| Element  | Supported |',
    '| -------- | :-------: |',
    '| Headings |    Yes    |',
    '| Tables   |    Yes    |',
    '| Images   |    Yes    |',
    '',
    '1. Write or paste your Markdown',
    '2. Check the preview',
    '3. Hit **Download PDF**',
    '',
    '- [x] Try MD2PDF',
    '- [ ] Share it',
    ''
].join('\n');

function renderNow() {
    var text = editor.value;
    preview.innerHTML = MD.render(text);
    var words = text.trim() ? text.trim().split(/\s+/).length : 0;
    wordCount.textContent = words + (words === 1 ? ' word' : ' words');
    try {
        localStorage.setItem(STORAGE_KEY, text);
    } catch (e) { /* storage may be unavailable */ }
}

function saveTitle() {
    try { localStorage.setItem(TITLE_KEY, docTitle.value); } catch (e) {}
}

// Debounce rendering for smoothness on large documents.
var renderTimer = null;
editor.addEventListener('input', function () {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderNow, 80);
});

docTitle.addEventListener('input', saveTitle);

// Tab inserts two spaces instead of leaving the textarea.
editor.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        var s = editor.selectionStart;
        var eend = editor.selectionEnd;
        editor.value = editor.value.slice(0, s) + '  ' + editor.value.slice(eend);
        editor.selectionStart = editor.selectionEnd = s + 2;
        renderNow();
    }
});

document.getElementById('sample-btn').addEventListener('click', function () {
    editor.value = SAMPLE;
    renderNow();
    editor.focus();
});

document.getElementById('clear-btn').addEventListener('click', function () {
    if (editor.value.trim() && !confirm('Clear the editor?')) return;
    editor.value = '';
    renderNow();
    editor.focus();
});

// View toggle — on narrow / portrait screens only one pane is shown at a
// time; these buttons pick which. On wide screens the toggle is hidden and
// both panes are always visible, so the classes are simply inert there.
var workspace = document.querySelector('.workspace');
var viewButtons = document.querySelectorAll('.view-btn');
viewButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
        var view = btn.getAttribute('data-view');
        workspace.classList.toggle('show-editor', view === 'editor');
        workspace.classList.toggle('show-preview', view === 'preview');
        viewButtons.forEach(function (b) {
            var active = b === btn;
            b.classList.toggle('is-active', active);
            b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
    });
});

// Download-as-PDF via the browser's native print pipeline.
// We copy the rendered document into a dedicated print surface so
// only the document (not the app chrome) reaches the page.
function downloadPdf() {
    var title = (docTitle.value || 'Untitled document').trim();
    printRoot.innerHTML =
        '<div class="print-doc markdown-body">' + preview.innerHTML + '</div>';
    var prevTitle = document.title;
    document.title = title; // becomes the default PDF filename in most browsers
    window.print();
    // Restore after the print dialog has been invoked.
    setTimeout(function () { document.title = prevTitle; }, 500);
}

document.getElementById('download-btn').addEventListener('click', downloadPdf);

// Ctrl/Cmd+P and Ctrl/Cmd+S both route to our PDF export.
document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's')) {
        e.preventDefault();
        downloadPdf();
    }
});

// Restore last session.
(function init() {
    var saved = null, savedTitle = null;
    try {
        saved = localStorage.getItem(STORAGE_KEY);
        savedTitle = localStorage.getItem(TITLE_KEY);
    } catch (e) {}
    editor.value = (saved !== null && saved !== '') ? saved : SAMPLE;
    if (savedTitle) docTitle.value = savedTitle;
    renderNow();
})();
