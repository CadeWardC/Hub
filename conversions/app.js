/* ============================================================
   Conversions — local file converter (no uploads, no storage)
   Audio/video  → MP3 (lamejs) or WAV (Web Audio decode)
   Images       → JPEG / PNG / WebP (canvas)
   ============================================================ */
(function () {
    'use strict';

    // ---------- State ----------
    // entry: { id, file, kind: 'audio'|'image', status: 'ready'|'converting'|'done'|'error',
    //          blob, outName, message }
    const entries = new Map();
    let nextId = 1;
    let converting = false;

    // ---------- Elements ----------
    let convertBtn, clearBtn, dropView, queueView, dropzone, addMore, fileList,
        queueSummary, fileInput, toast, audioFormatSel, mp3BitrateSel,
        imageFormatSel, qualityField, qualityInput, qualityValue, settingsBar;

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        convertBtn = document.getElementById('convert-btn');
        clearBtn = document.getElementById('clear-btn');
        dropView = document.getElementById('drop-view');
        queueView = document.getElementById('queue-view');
        dropzone = document.getElementById('dropzone');
        addMore = document.getElementById('add-more');
        fileList = document.getElementById('file-list');
        queueSummary = document.getElementById('queue-summary');
        fileInput = document.getElementById('file-input');
        toast = document.getElementById('toast');
        settingsBar = document.querySelector('.settings-bar');
        audioFormatSel = document.getElementById('audio-format');
        mp3BitrateSel = document.getElementById('mp3-bitrate');
        imageFormatSel = document.getElementById('image-format');
        qualityField = document.getElementById('quality-field');
        qualityInput = document.getElementById('image-quality');
        qualityValue = document.getElementById('quality-value');

        if (typeof lamejs === 'undefined') {
            audioFormatSel.querySelector('option[value="mp3"]').disabled = true;
            audioFormatSel.value = 'wav';
            showToast('MP3 encoder failed to load — WAV output only.', true);
        }

        dropzone.addEventListener('click', () => fileInput.click());
        addMore.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
        });
        fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });

        // Keep the browser from navigating away when a drop misses a zone
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
        [dropzone, addMore].forEach((zone) => {
            zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('is-dragover'); });
            zone.addEventListener('dragleave', () => zone.classList.remove('is-dragover'));
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('is-dragover');
                addFiles(e.dataTransfer.files);
            });
        });

        document.addEventListener('paste', (e) => {
            if (e.clipboardData && e.clipboardData.files.length) addFiles(e.clipboardData.files);
        });

        convertBtn.addEventListener('click', convertAll);
        clearBtn.addEventListener('click', resetAll);

        audioFormatSel.addEventListener('change', () => {
            mp3BitrateSel.hidden = audioFormatSel.value !== 'mp3';
            resetDone('audio');
            refreshSummary();
        });
        imageFormatSel.addEventListener('change', () => {
            qualityField.classList.toggle('is-visible', imageFormatSel.value !== 'png');
            resetDone('image');
            refreshSummary();
        });
        qualityInput.addEventListener('input', () => { qualityValue.textContent = qualityInput.value; });
        qualityInput.addEventListener('change', () => { resetDone('image'); refreshSummary(); });

        qualityField.classList.toggle('is-visible', imageFormatSel.value !== 'png');
        mp3BitrateSel.hidden = audioFormatSel.value !== 'mp3';
    }

    // ---------- Adding files ----------
    function addFiles(list) {
        let added = 0;
        for (const file of Array.from(list || [])) {
            const kind = categoryOf(file);
            if (!kind) {
                showToast(`Skipped "${file.name}" — unsupported file type.`, true);
                continue;
            }
            const entry = {
                id: nextId++,
                file,
                kind,
                status: 'ready',
                blob: null,
                outName: '',
                message: ''
            };
            entries.set(entry.id, entry);
            fileList.appendChild(buildRow(entry));
            added++;
        }
        if (added) {
            dropView.hidden = true;
            queueView.hidden = false;
        }
        refreshSummary();
    }

    function categoryOf(file) {
        const type = (file.type || '').toLowerCase();
        if (type.startsWith('image/')) return 'image';
        if (type.startsWith('audio/') || type.startsWith('video/')) return 'audio';
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'avif', 'ico'].includes(ext)) return 'image';
        if (['mp4', 'm4v', 'mov', 'webm', 'mkv', 'm4a', 'mp3', 'wav', 'ogg', 'oga', 'flac', 'opus', 'aac', 'wma', 'aif', 'aiff'].includes(ext)) return 'audio';
        return null;
    }

    // ---------- Row rendering ----------
    function buildRow(entry) {
        const row = document.createElement('li');
        row.className = 'file-row';
        row.dataset.id = entry.id;

        const icon = document.createElement('div');
        icon.className = 'file-icon';
        icon.textContent = entry.kind === 'audio' ? '\u{1F3A7}' : '\u{1F5BC}';

        const info = document.createElement('div');
        info.className = 'file-info';
        const name = document.createElement('span');
        name.className = 'file-name';
        name.textContent = entry.file.name;
        name.title = entry.file.name;
        const sub = document.createElement('span');
        sub.className = 'file-sub';
        const progress = document.createElement('div');
        progress.className = 'progress';
        progress.hidden = true;
        const fill = document.createElement('div');
        fill.className = 'progress-fill';
        progress.appendChild(fill);
        info.append(name, sub, progress);

        const actions = document.createElement('div');
        actions.className = 'file-actions';
        const download = document.createElement('button');
        download.type = 'button';
        download.className = 'btn btn-primary row-download';
        download.textContent = 'Download';
        download.hidden = true;
        download.addEventListener('click', () => downloadEntry(entry));
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'row-remove';
        remove.textContent = '\u2715';
        remove.setAttribute('aria-label', 'Remove ' + entry.file.name);
        remove.addEventListener('click', () => removeEntry(entry));
        actions.append(download, remove);

        row.append(icon, info, actions);
        entry.row = row;
        entry.sub = sub;
        entry.progress = progress;
        entry.fill = fill;
        entry.downloadBtn = download;
        renderRow(entry);
        return row;
    }

    function renderRow(entry) {
        entry.row.classList.toggle('is-converting', entry.status === 'converting');
            entry.row.classList.toggle('is-done', entry.status === 'done');
            entry.row.classList.toggle('is-error', entry.status === 'error');

            entry.progress.hidden = entry.status !== 'converting';
            if (entry.status === 'converting') entry.fill.style.width = '0%';

            entry.downloadBtn.hidden = entry.status !== 'done';

            const sub = entry.sub;
            sub.classList.remove('is-error', 'is-done');
            if (entry.status === 'ready') {
                sub.textContent = formatBytes(entry.file.size) + '  \u2192  ' + targetLabel(entry);
            } else if (entry.status === 'converting') {
                sub.textContent = 'Converting\u2026';
            } else if (entry.status === 'done') {
                sub.classList.add('is-done');
                sub.textContent = '\u2192 ' + targetLabel(entry) + ' \u00B7 ' + formatBytes(entry.blob.size) +
                    (entry.message ? ' \u00B7 ' + entry.message : '');
            } else {
                sub.classList.add('is-error');
                sub.textContent = entry.message || 'Conversion failed.';
            }
    }

    function targetLabel(entry) {
        if (entry.kind === 'audio') {
            return audioFormatSel.value === 'mp3' ? 'MP3 \u00B7 ' + mp3BitrateSel.value + ' kbps' : 'WAV';
        }
        const fmt = imageFormatSel.value;
        return fmt === 'jpeg' ? 'JPEG \u00B7 ' + qualityInput.value + '%' : fmt.toUpperCase();
    }

    function refreshSummary() {
        const all = [...entries.values()];
        if (!all.length) {
            queueView.hidden = true;
            dropView.hidden = false;
            convertBtn.disabled = true;
            clearBtn.disabled = true;
            return;
        }
        const ready = all.filter((e) => e.status === 'ready').length;
        const busy = all.filter((e) => e.status === 'converting').length;
        const done = all.filter((e) => e.status === 'done').length;
        let text = all.length + (all.length === 1 ? ' file' : ' files');
        if (busy) text += ' \u00B7 ' + busy + ' converting';
        if (ready) text += ' \u00B7 ' + ready + ' ready';
        if (done) text += ' \u00B7 ' + done + ' done';
        queueSummary.textContent = text;
        convertBtn.disabled = converting || !ready;
        clearBtn.disabled = converting;
    }

    function removeEntry(entry) {
        entries.delete(entry.id);
        entry.row.remove();
        refreshSummary();
    }

    function resetDone(kind) {
        for (const entry of entries.values()) {
            if (entry.kind === kind && entry.status === 'done') {
                entry.status = 'ready';
                entry.blob = null;
                entry.outName = '';
                entry.message = '';
                renderRow(entry);
            }
        }
    }

    function resetAll() {
        if (converting) return;
        entries.clear();
        fileList.textContent = '';
        refreshSummary();
    }

    // ---------- Conversion loop ----------
    async function convertAll() {
        if (converting) return;
        const pending = [...entries.values()].filter((e) => e.status === 'ready');
        if (!pending.length) {
            showToast('Nothing to convert — add some files first.');
            return;
        }
        converting = true;
        settingsBar.classList.add('is-busy');
        refreshSummary();

        for (const entry of pending) {
            entry.status = 'converting';
            entry.message = '';
            renderRow(entry);
            refreshSummary();
            try {
                const result = entry.kind === 'audio'
                    ? await convertAudioEntry(entry)
                    : await convertImageEntry(entry);
                entry.blob = result.blob;
                entry.outName = result.name;
                entry.message = result.note || '';
                entry.status = 'done';
            } catch (err) {
                console.error('Conversion failed for', entry.file.name, err);
                entry.status = 'error';
                entry.message = humanizeError(err);
            }
            renderRow(entry);
        }

        converting = false;
        settingsBar.classList.remove('is-busy');
        refreshSummary();
    }

    async function convertAudioEntry(entry) {
        const baseName = stripExtension(entry.file.name);
        const audioBuffer = await decodeMedia(entry.file);
        const duration = formatDuration(audioBuffer.duration);

        let blob;
        if (audioFormatSel.value === 'wav') {
            blob = encodeWav(audioBuffer);
        } else {
            const kbps = parseInt(mp3BitrateSel.value, 10) || 192;
            const onProgress = (ratio) => {
                entry.fill.style.width = Math.round(ratio * 100) + '%';
            };
            blob = await encodeMp3(audioBuffer, kbps, onProgress);
        }
        return { blob, name: baseName + '.' + audioFormatSel.value, note: duration };
    }

    async function convertImageEntry(entry) {
        const baseName = stripExtension(entry.file.name);
        const fmt = imageFormatSel.value;
        const blob = await imageToFormat(entry.file, fmt, parseInt(qualityInput.value, 10) / 100);
        return { blob, name: baseName + '.' + (fmt === 'jpeg' ? 'jpg' : fmt) };
    }

    // ---------- Media decoding ----------
    let decodeCtx = null;
    function getDecodeCtx() {
        // A short OfflineAudioContext at 44.1 kHz decodes + resamples to a
        // rate lamejs can encode directly.
        if (!decodeCtx) {
            const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
            decodeCtx = new Ctx(1, 1, 44100);
        }
        return decodeCtx;
    }

    async function decodeMedia(file) {
        // decodeAudioData detaches the buffer it consumes, so each attempt
        // needs a fresh copy of the file bytes.
        try {
            return await getDecodeCtx().decodeAudioData(await file.arrayBuffer());
        } catch (err1) {
            try {
                const live = new (window.AudioContext || window.webkitAudioContext)();
                try {
                    return await live.decodeAudioData(await file.arrayBuffer());
                } finally {
                    live.close();
                }
            } catch (err2) {
                throw err2 instanceof Error ? err2 : new Error('Decode failed');
            }
        }
    }

    // ---------- MP3 encoding ----------
    const yieldToUi = () => new Promise((resolve) => setTimeout(resolve, 0));

    function floatToInt16(src, start, count, out) {
        for (let i = 0; i < count; i++) {
            const s = Math.max(-1, Math.min(1, src[start + i]));
            out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
    }

    async function encodeMp3(audioBuffer, kbps, onProgress) {
        const channels = Math.min(2, audioBuffer.numberOfChannels);
        const encoder = new lamejs.Mp3Encoder(channels, audioBuffer.sampleRate, kbps);
        const left = audioBuffer.getChannelData(0);
        const right = channels > 1 ? audioBuffer.getChannelData(1) : null;

        const blockSize = 1152 * 40; // ~1 s of audio per pass
        const left16 = new Int16Array(blockSize);
        const right16 = channels > 1 ? new Int16Array(blockSize) : null;
        const parts = [];

        for (let offset = 0; offset < left.length; offset += blockSize) {
            const n = Math.min(blockSize, left.length - offset);
            const lChunk = n === blockSize ? left16 : new Int16Array(n);
            floatToInt16(left, offset, n, lChunk);
            let rChunk = null;
            if (right16) {
                rChunk = n === blockSize ? right16 : new Int16Array(n);
                floatToInt16(right, offset, n, rChunk);
            }
            const buf = channels > 1
                ? encoder.encodeBuffer(lChunk, rChunk)
                : encoder.encodeBuffer(lChunk);
            if (buf.length) parts.push(new Uint8Array(buf));
            if (onProgress) onProgress(Math.min(1, (offset + n) / left.length));
            // Yield so the progress bar paints and the page stays responsive
            await yieldToUi();
        }

        const tail = encoder.flush();
        if (tail.length) parts.push(new Uint8Array(tail));
        return new Blob(parts, { type: 'audio/mpeg' });
    }

    // ---------- WAV encoding ----------
    function encodeWav(audioBuffer) {
        const channels = Math.min(2, audioBuffer.numberOfChannels);
        const frames = audioBuffer.length;
        const dataSize = frames * channels * 2;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        writeAscii(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeAscii(view, 8, 'WAVE');
        writeAscii(view, 12, 'fmt ');
        view.setUint32(16, 16, true);          // fmt chunk size
        view.setUint16(20, 1, true);           // PCM
        view.setUint16(22, channels, true);
        view.setUint32(24, audioBuffer.sampleRate, true);
        view.setUint32(28, audioBuffer.sampleRate * channels * 2, true); // byte rate
        view.setUint16(32, channels * 2, true); // block align
        view.setUint16(34, 16, true);          // bits per sample
        writeAscii(view, 36, 'data');
        view.setUint32(40, dataSize, true);

        const chans = [];
        for (let c = 0; c < channels; c++) chans.push(audioBuffer.getChannelData(c));
        let offset = 44;
        for (let i = 0; i < frames; i++) {
            for (let c = 0; c < channels; c++) {
                const s = Math.max(-1, Math.min(1, chans[c][i]));
                view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                offset += 2;
            }
        }
        return new Blob([buffer], { type: 'audio/wav' });
    }

    function writeAscii(view, offset, text) {
        for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
    }

    // ---------- Image conversion ----------
    function imageToFormat(file, fmt, quality) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                try {
                    const width = img.naturalWidth || 1024;
                    const height = img.naturalHeight || 1024;
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (fmt === 'jpeg') {
                        ctx.fillStyle = '#ffffff'; // JPEG has no alpha
                        ctx.fillRect(0, 0, width, height);
                    }
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        URL.revokeObjectURL(url);
                        if (blob) resolve(blob);
                        else reject(new Error('This browser cannot export ' + fmt.toUpperCase() + '.'));
                    }, 'image/' + fmt, quality);
                } catch (err) {
                    URL.revokeObjectURL(url);
                    reject(err);
                }
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Unsupported image.'));
            };
            img.src = url;
        });
    }

    // ---------- Downloads ----------
    function downloadEntry(entry) {
        if (!entry.blob) return;
        const url = URL.createObjectURL(entry.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = entry.outName || ('converted.' + audioFormatSel.value);
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    // ---------- Helpers ----------
    function stripExtension(name) {
        return name.replace(/\.[^.]+$/, '') || name;
    }

    function formatBytes(bytes) {
        if (!Number.isFinite(bytes) || bytes < 0) return '?';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function formatDuration(seconds) {
        if (!Number.isFinite(seconds)) return '';
        const total = Math.round(seconds);
        const m = Math.floor(total / 60);
        const s = total % 60;
        return m + ':' + String(s).padStart(2, '0');
    }

    function humanizeError(err) {
        const msg = err && err.message ? err.message : '';
        if (/decod/i.test(msg) || msg === 'Decode failed') {
            return "Couldn't decode this file — the browser doesn't support its codec.";
        }
        return msg || 'Conversion failed.';
    }

    let toastTimer = null;
    function showToast(message, isError) {
        toast.textContent = message;
        toast.classList.toggle('is-error', !!isError);
        toast.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
    }
})();
