/* ============================================================
   Conversions — local file converter (no uploads, no storage)
   Audio/video → MP3 (lamejs), WAV (Web Audio), Opus/M4A/WebM/MP4
   (MediaRecorder), animated GIF (gifenc), PNG frame grab
   Images      → JPEG/PNG/WebP (canvas), BMP, GIF, ICO, PDF
   CSV/TSV/JSON → JSON or CSV
   TXT/Markdown → PDF
   Any finished batch → ZIP download
   ============================================================ */
(function () {
    'use strict';

    // ---------- State ----------
    // entry: { id, file, kind, status: 'ready'|'converting'|'done'|'error',
    //          blob, outName, message }
    const entries = new Map();
    let nextId = 1;
    let converting = false;

    // ---------- Elements ----------
    let convertBtn, clearBtn, zipBtn, dropView, queueView, dropzone, addMore,
        fileList, queueSummary, fileInput, toast, settingsBar, audioFormatSel,
        videoFormatSel, mp3BitrateSel, imageFormatSel, dataFormatSel,
        qualityField, qualityInput, qualityValue;

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        convertBtn = document.getElementById('convert-btn');
        clearBtn = document.getElementById('clear-btn');
        zipBtn = document.getElementById('zip-btn');
        dropView = document.getElementById('drop-view');
        queueView = document.getElementById('queue-view');
        dropzone = document.getElementById('dropzone');
        addMore = document.getElementById('add-more');
        fileList = document.getElementById('file-list');
        queueSummary = document.getElementById('queue-summary');
        fileInput = document.getElementById('file-input');
        toast = document.getElementById('toast');
        settingsBar = document.getElementById('settings-bar');
        audioFormatSel = document.getElementById('audio-format');
        videoFormatSel = document.getElementById('video-format');
        mp3BitrateSel = document.getElementById('mp3-bitrate');
        imageFormatSel = document.getElementById('image-format');
        dataFormatSel = document.getElementById('data-format');
        qualityField = document.getElementById('quality-field');
        qualityInput = document.getElementById('image-quality');
        qualityValue = document.getElementById('quality-value');

        if (typeof lamejs === 'undefined') {
            disableOption(audioFormatSel, 'mp3');
            disableOption(videoFormatSel, 'mp3');
            audioFormatSel.value = 'wav';
            videoFormatSel.value = 'wav';
            showToast('MP3 encoder failed to load — MP3 output disabled.', true);
        }
        if (typeof gifenc === 'undefined') {
            disableOption(videoFormatSel, 'gif');
            disableOption(imageFormatSel, 'gif');
            showToast('GIF encoder failed to load — GIF output disabled.', true);
        }

        // MediaRecorder formats depend on browser support
        const m4aMime = firstSupported(['audio/mp4;codecs=mp4a.40.2', 'audio/mp4']);
        const mp4Mime = firstSupported([
            'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
            'video/mp4;codecs=avc1',
            'video/mp4'
        ]);
        if (firstSupported(['audio/webm;codecs=opus', 'audio/webm'])) {
            audioFormatSel.querySelector('option[value="opus"]').disabled = false;
            videoFormatSel.querySelector('option[value="opus"]').disabled = false;
        } else {
            disableOption(audioFormatSel, 'opus');
            disableOption(videoFormatSel, 'opus');
        }
        if (m4aMime) {
            audioFormatSel.querySelector('option[value="m4a"]').hidden = false;
            videoFormatSel.querySelector('option[value="m4a"]').hidden = false;
        }
        if (mp4Mime) {
            videoFormatSel.querySelector('option[value="mp4"]').hidden = false;
        }
        appState.m4aMime = m4aMime;
        appState.mp4Mime = mp4Mime;
        appState.webmMime = firstSupported([
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm'
        ]);

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
        zipBtn.addEventListener('click', downloadZip);

        audioFormatSel.addEventListener('change', () => {
            syncSettingVisibility();
            resetDone('audio');
            refreshSummary();
        });
        videoFormatSel.addEventListener('change', () => {
            resetDone('video');
            refreshSummary();
        });
        imageFormatSel.addEventListener('change', () => {
            syncSettingVisibility();
            resetDone('image');
            refreshSummary();
        });
        dataFormatSel.addEventListener('change', () => {
            resetDone('data');
            refreshSummary();
        });
        qualityInput.addEventListener('input', () => { qualityValue.textContent = qualityInput.value; });
        qualityInput.addEventListener('change', () => { resetDone('image'); refreshSummary(); });

        syncSettingVisibility();
    }

    const appState = {};

    function disableOption(select, value) {
        const opt = select.querySelector('option[value="' + value + '"]');
        if (opt) opt.disabled = true;
    }

    function firstSupported(candidates) {
        if (typeof MediaRecorder === 'undefined') return null;
        for (const mime of candidates) {
            try { if (MediaRecorder.isTypeSupported(mime)) return mime; } catch (e) { /* keep looking */ }
        }
        return null;
    }

    // ---------- Kind & format model ----------
    const AUDIO_EXTS = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'flac', 'wma', 'aif', 'aiff'];
    const VIDEO_EXTS = ['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi'];
    const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'avif', 'ico'];
    const DATA_EXTS = ['csv', 'tsv', 'json'];
    const TEXT_EXTS = ['txt', 'md', 'markdown'];

    function categoryOf(file) {
        const type = (file.type || '').toLowerCase();
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (type.startsWith('image/') || IMAGE_EXTS.includes(ext)) {
            // A .gif is an image; an .svg/.ico are images too
            return 'image';
        }
        if (type.startsWith('video/') || VIDEO_EXTS.includes(ext)) return 'video';
        if (type.startsWith('audio/') || AUDIO_EXTS.includes(ext)) return 'audio';
        if (DATA_EXTS.includes(ext)) return 'data';
        if (TEXT_EXTS.includes(ext)) return 'text';
        return null;
    }

    function targetLabel(entry) {
        switch (entry.kind) {
            case 'audio': return audioLabel(audioFormatSel.value);
            case 'video': return videoLabel(videoFormatSel.value);
            case 'image': return imageLabel(imageFormatSel.value);
            case 'data': return dataFormatSel.value.toUpperCase();
            case 'text': return 'PDF';
        }
        return '?';
    }

    function audioLabel(fmt) {
        if (fmt === 'mp3') return 'MP3 \u00B7 ' + mp3BitrateSel.value + ' kbps';
        if (fmt === 'opus') return 'Opus';
        if (fmt === 'm4a') return 'M4A';
        return fmt.toUpperCase();
    }

    function videoLabel(fmt) {
        if (fmt === 'png') return 'PNG (frame)';
        if (fmt === 'webm') return 'WebM';
        return audioLabel(fmt);
    }

    function imageLabel(fmt) {
        const base = fmt === 'ico' ? 'ICO' : fmt.toUpperCase();
        return (fmt === 'jpeg' || fmt === 'webp') ? base + ' \u00B7 ' + qualityInput.value + '%' : base;
    }

    function syncSettingVisibility() {
        mp3BitrateSel.hidden = audioFormatSel.value !== 'mp3';
        qualityField.classList.toggle('is-visible', imageFormatSel.value === 'jpeg' || imageFormatSel.value === 'webp');
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
            updateGroupVisibility();
        }
        refreshSummary();
    }

    // ---------- Row rendering ----------
    function buildRow(entry) {
        const row = document.createElement('li');
        row.className = 'file-row';
        row.dataset.id = entry.id;

        const icon = document.createElement('div');
        icon.className = 'file-icon';
        const icons = { audio: '\u{1F3A7}', video: '\u{1F3AC}', image: '\u{1F5BC}', data: '\u{1F5C3}', text: '\u{1F4C4}' };
        icon.textContent = icons[entry.kind] || '\u{1F4C1}';

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

        entry.downloadBtn.hidden = !(entry.status === 'done' && entry.blob);

        const sub = entry.sub;
        sub.classList.remove('is-error', 'is-done');
        if (entry.status === 'ready') {
            sub.textContent = formatBytes(entry.file.size) + '  \u2192  ' + targetLabel(entry);
        } else if (entry.status === 'converting') {
            sub.textContent = 'Converting\u2026';
        } else if (entry.status === 'done') {
            sub.classList.add('is-done');
            const size = entry.blob ? ' \u00B7 ' + formatBytes(entry.blob.size) : '';
            sub.textContent = '\u2192 ' + targetLabel(entry) + size +
                (entry.message ? ' \u00B7 ' + entry.message : '');
        } else {
            sub.classList.add('is-error');
            sub.textContent = entry.message || 'Conversion failed.';
        }
    }

    function refreshSummary() {
        const all = [...entries.values()];
        if (!all.length) {
            queueView.hidden = true;
            dropView.hidden = false;
            settingsBar.querySelectorAll('.setting-group').forEach((g) => { g.hidden = false; });
            convertBtn.disabled = true;
            clearBtn.disabled = true;
            zipBtn.hidden = true;
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
        zipBtn.hidden = done === 0;
    }

    function updateGroupVisibility() {
        const kinds = new Set([...entries.values()].map((e) => e.kind));
        settingsBar.querySelectorAll('.setting-group[data-kind]').forEach((group) => {
            group.hidden = !kinds.has(group.dataset.kind);
        });
    }

    function removeEntry(entry) {
        entries.delete(entry.id);
        entry.row.remove();
        updateGroupVisibility();
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
        updateGroupVisibility();
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
                const result = await convertEntry(entry);
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

    async function convertEntry(entry) {
        const baseName = stripExtension(entry.file.name);
        switch (entry.kind) {
            case 'audio': return convertAudio(baseName, entry);
            case 'video': return convertVideo(baseName, entry);
            case 'image': return convertImage(baseName, entry);
            case 'data': return convertData(baseName, entry);
            case 'text': return convertText(baseName, entry);
        }
        throw new Error('Unknown file kind.');
    }

    // ---------- Audio & video ----------
    async function convertAudio(baseName, entry) {
        const fmt = audioFormatSel.value;
        return convertMedia(baseName, entry, fmt, 'audio');
    }

    async function convertVideo(baseName, entry) {
        const fmt = videoFormatSel.value;
        return convertMedia(baseName, entry, fmt, 'video');
    }

    async function convertMedia(baseName, entry, fmt, kind) {
        if (kind === 'video' && fmt === 'gif') {
            const blob = await videoToGif(entry.file, (r) => setProgress(entry, r));
            return { blob, name: baseName + '.gif', note: '12 fps \u00B7 first 30 s' };
        }
        if (kind === 'video' && fmt === 'png') {
            const blob = await videoSnapshot(entry.file);
            return { blob, name: baseName + '.png' };
        }
        if (kind === 'video' && (fmt === 'webm' || fmt === 'mp4')) {
            const mime = fmt === 'webm' ? appState.webmMime : appState.mp4Mime;
            if (!mime) throw new Error('This browser cannot record ' + fmt.toUpperCase() + ' video.');
            const blob = await reencodeVideo(entry.file, mime, (r) => setProgress(entry, r));
            return { blob, name: baseName + '.' + fmt, note: 'real-time re-encode' };
        }
        // Audio extraction: mp3 / wav / opus / m4a (also valid targets for video)
        if (fmt === 'mp3') {
            const audioBuffer = await decodeMedia(entry.file);
            const blob = await encodeMp3(audioBuffer, parseInt(mp3BitrateSel.value, 10) || 192,
                (r) => setProgress(entry, r));
            return { blob, name: baseName + '.mp3', note: formatDuration(audioBuffer.duration) };
        }
        if (fmt === 'wav') {
            const audioBuffer = await decodeMedia(entry.file);
            return { blob: encodeWav(audioBuffer), name: baseName + '.wav', note: formatDuration(audioBuffer.duration) };
        }
        if (fmt === 'opus' || fmt === 'm4a') {
            const mime = fmt === 'opus'
                ? firstSupported(['audio/webm;codecs=opus', 'audio/webm'])
                : appState.m4aMime;
            if (!mime) throw new Error('This browser cannot record ' + fmt.toUpperCase() + ' audio.');
            const audioBuffer = await decodeMedia(entry.file);
            const blob = await recordAudioBuffer(audioBuffer, mime, (r) => setProgress(entry, r));
            return { blob, name: baseName + (fmt === 'opus' ? '.webm' : '.m4a'), note: 'real-time encode' };
        }
        throw new Error('Unsupported target format.');
    }

    function setProgress(entry, ratio) {
        entry.fill.style.width = Math.round(Math.min(1, ratio) * 100) + '%';
    }

    // ---------- Decoding ----------
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
                throw new Error("Couldn't decode this file — the browser doesn't support its codec.");
            }
        }
    }

    // ---------- MP3 ----------
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

    // ---------- WAV ----------
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
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, channels, true);
        view.setUint32(24, audioBuffer.sampleRate, true);
        view.setUint32(28, audioBuffer.sampleRate * channels * 2, true);
        view.setUint16(32, channels * 2, true);
        view.setUint16(34, 16, true);
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

    // ---------- MediaRecorder encoders (Opus, M4A, WebM, MP4) ----------
    // These record in real time, so a 2-minute track takes ~2 minutes.
    async function recordAudioBuffer(audioBuffer, mime, onProgress) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        try {
            const dest = ctx.createMediaStreamDestination();
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(dest);

            const recorder = new MediaRecorder(dest.stream, { mimeType: mime });
            const chunks = [];
            recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
            const stopped = new Promise((res) => { recorder.onstop = res; });

            recorder.start(500);
            source.start();

            const startedAt = ctx.currentTime;
            const timer = setInterval(() => {
                if (onProgress) onProgress((ctx.currentTime - startedAt) / audioBuffer.duration);
            }, 250);

            await new Promise((res) => { source.onended = res; });
            await new Promise((r) => setTimeout(r, 300)); // flush the encoder tail
            clearInterval(timer);
            recorder.stop();
            await stopped;
            return new Blob(chunks, { type: mime.split(';')[0] });
        } finally {
            ctx.close();
        }
    }

    async function reencodeVideo(file, mime, onProgress) {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.playsInline = true;
        video.src = url;
        let audioCtx = null;
        try {
            await waitForEvent(video, 'loadedmetadata');
            if (video.duration === Infinity || !video.duration) {
                throw new Error('Unsupported or broken video file.');
            }

            // Route element audio through WebAudio so conversion is silent
            // but the recorded track still carries sound.
            const videoStream = video.captureStream
                ? video.captureStream()
                : video.mozCaptureStream();
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const dest = audioCtx.createMediaStreamDestination();
            try {
                audioCtx.createMediaElementSource(video).connect(dest);
            } catch (e) {
                // Element already routed or unsupported — fall back to element audio
            }

            const stream = new MediaStream([
                ...videoStream.getVideoTracks(),
                ...dest.stream.getAudioTracks()
            ]);
            const recorder = new MediaRecorder(stream, {
                mimeType: mime,
                videoBitsPerSecond: 5_000_000
            });
            const chunks = [];
            recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
            const stopped = new Promise((res) => { recorder.onstop = res; });

            const timer = setInterval(() => onProgress(video.currentTime / video.duration), 250);
            recorder.start(500);
            await video.play();
            await waitForEvent(video, 'ended');
            clearInterval(timer);
            await new Promise((r) => setTimeout(r, 300));
            recorder.stop();
            await stopped;
            return new Blob(chunks, { type: mime.split(';')[0] });
        } finally {
            if (audioCtx) audioCtx.close();
            video.pause();
            video.removeAttribute('src');
            video.load();
            URL.revokeObjectURL(url);
        }
    }

    function waitForEvent(target, event) {
        return new Promise((resolve, reject) => {
            const ok = () => cleanup(resolve);
            const bad = () => cleanup(() => reject(new Error('Media failed to load.')));
            function cleanup(done) {
                target.removeEventListener(event, ok);
                target.removeEventListener('error', bad);
                done();
            }
            target.addEventListener(event, ok, { once: true });
            target.addEventListener('error', bad, { once: true });
        });
    }

    // ---------- Video → GIF & snapshot ----------
    const GIF_MAX_FPS = 12;
    const GIF_MAX_WIDTH = 480;
    const GIF_MAX_DURATION = 30;

    async function videoToGif(file, onProgress) {
        if (typeof gifenc === 'undefined') throw new Error('GIF encoder unavailable.');
        const { GIFEncoder, quantize, applyPalette } = gifenc;

        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.src = url;
        try {
            await waitForEvent(video, 'loadedmetadata');
            const duration = Math.min(video.duration || 0, GIF_MAX_DURATION);
            if (!duration) throw new Error('Unsupported or broken video file.');
            const scale = Math.min(1, GIF_MAX_WIDTH / (video.videoWidth || GIF_MAX_WIDTH));
            const width = Math.max(2, Math.round((video.videoWidth || 320) * scale / 2) * 2);
            const height = Math.max(2, Math.round((video.videoHeight || 240) * scale / 2) * 2);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            const totalFrames = Math.max(1, Math.floor(duration * GIF_MAX_FPS));
            const gif = GIFEncoder();
            for (let i = 0; i < totalFrames; i++) {
                await seekVideo(video, i / GIF_MAX_FPS);
                ctx.drawImage(video, 0, 0, width, height);
                const { data } = ctx.getImageData(0, 0, width, height);
                const palette = quantize(data, 256);
                const indexed = applyPalette(data, palette);
                gif.writeFrame(indexed, width, height, {
                    palette,
                    delay: Math.round(1000 / GIF_MAX_FPS)
                });
                if (onProgress) onProgress((i + 1) / totalFrames);
                await yieldToUi();
            }
            gif.finish();
            return new Blob([gif.bytes()], { type: 'image/gif' });
        } finally {
            video.removeAttribute('src');
            video.load();
            URL.revokeObjectURL(url);
        }
    }

    function seekVideo(video, time) {
        return new Promise((resolve) => {
            if (video.currentTime === time) { resolve(); return; }
            const done = () => { video.removeEventListener('seeked', done); resolve(); };
            video.addEventListener('seeked', done);
            video.currentTime = time;
        });
    }

    async function videoSnapshot(file) {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.src = url;
        try {
            await waitForEvent(video, 'loadedmetadata');
            await seekVideo(video, Math.min(1, (video.duration || 2) / 2));
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 320;
            canvas.height = video.videoHeight || 240;
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
            if (!blob) throw new Error('Snapshot failed.');
            return blob;
        } finally {
            video.removeAttribute('src');
            video.load();
            URL.revokeObjectURL(url);
        }
    }

    // ---------- Images ----------
    async function convertImage(baseName, entry) {
        const fmt = imageFormatSel.value;
        const quality = parseInt(qualityInput.value, 10) / 100;

        if (fmt === 'jpeg' || fmt === 'png' || fmt === 'webp') {
            const blob = await imageToFormat(entry.file, fmt, quality);
            return { blob, name: baseName + (fmt === 'jpeg' ? '.jpg' : '.' + fmt) };
        }
        if (fmt === 'bmp') {
            const blob = await imageToBmp(entry.file);
            return { blob, name: baseName + '.bmp' };
        }
        if (fmt === 'gif') {
            const blob = await imageToGif(entry.file);
            return { blob, name: baseName + '.gif' };
        }
        if (fmt === 'ico') {
            const blob = await imageToIco(entry.file);
            return { blob, name: baseName + '.ico' };
        }
        if (fmt === 'pdf') {
            const blob = await imageToPdf(entry.file, quality);
            return { blob, name: baseName + '.pdf' };
        }
        throw new Error('Unsupported target format.');
    }

    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Unsupported image.')); };
            img.src = url;
        });
    }

    function canvasFromImage(img) {
        const width = img.naturalWidth || 1024;
        const height = img.naturalHeight || 1024;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        return { canvas, ctx, width, height };
    }

    function canvasToBlob(canvas, mime, quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('This browser cannot export ' + mime + '.'));
            }, mime, quality);
        });
    }

    async function imageToFormat(file, fmt, quality) {
        const img = await loadImage(file);
        const { canvas, ctx, width, height } = canvasFromImage(img);
        if (fmt === 'jpeg') {
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = '#ffffff'; // JPEG has no alpha
            ctx.fillRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'source-over';
        }
        return canvasToBlob(canvas, 'image/' + fmt, quality);
    }

    async function imageToGif(file) {
        if (typeof gifenc === 'undefined') throw new Error('GIF encoder unavailable.');
        const { GIFEncoder, quantize, applyPalette } = gifenc;
        const img = await loadImage(file);
        const { ctx, width, height } = canvasFromImage(img);
        const { data } = ctx.getImageData(0, 0, width, height);
        const palette = quantize(data, 256);
        const indexed = applyPalette(data, palette);
        const gif = GIFEncoder();
        gif.writeFrame(indexed, width, height, { palette, delay: 0 });
        gif.finish();
        return new Blob([gif.bytes()], { type: 'image/gif' });
    }

    async function imageToBmp(file) {
        const img = await loadImage(file);
        const { ctx, width, height } = canvasFromImage(img);
        const src = ctx.getImageData(0, 0, width, height).data;
        const rowSize = Math.floor((24 * width + 31) / 32) * 4;
        const dataSize = rowSize * height;
        const buffer = new ArrayBuffer(54 + dataSize);
        const view = new DataView(buffer);
        writeAscii(view, 0, 'BM');
        view.setUint32(2, 54 + dataSize, true);
        view.setUint32(10, 54, true);
        view.setUint32(14, 40, true); // BITMAPINFOHEADER
        view.setInt32(18, width, true);
        view.setInt32(22, height, true); // positive → bottom-up rows
        view.setUint16(26, 1, true);
        view.setUint16(28, 24, true);
        view.setUint32(34, dataSize, true);
        view.setInt32(38, 2835, true); // 72 DPI in px/m
        view.setInt32(42, 2835, true);
        for (let y = height - 1; y >= 0; y--) {
            let x = 54 + y * rowSize;
            for (let px = 0; px < width; px++) {
                const i = (y * width + px) * 4;
                view.setUint8(x++, src[i + 2]);
                view.setUint8(x++, src[i + 1]);
                view.setUint8(x++, src[i]);
            }
        }
        return new Blob([buffer], { type: 'image/bmp' });
    }

    const ICO_SIZES = [16, 32, 48, 64];

    async function imageToIco(file) {
        const img = await loadImage(file);
        const pngs = [];
        for (const size of ICO_SIZES) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            canvas.getContext('2d').drawImage(img, 0, 0, size, size);
            const blob = await canvasToBlob(canvas, 'image/png');
            pngs.push(new Uint8Array(await blob.arrayBuffer()));
        }

        const headerSize = 6 + 16 * pngs.length;
        const totalSize = headerSize + pngs.reduce((sum, p) => sum + p.length, 0);
        const out = new Uint8Array(totalSize);
        const view = new DataView(out.buffer);
        view.setUint16(0, 0, true);
        view.setUint16(2, 1, true); // type: icon
        view.setUint16(4, pngs.length, true);

        let offset = headerSize;
        pngs.forEach((png, i) => {
            const size = ICO_SIZES[i];
            const e = 6 + 16 * i;
            out[e] = size % 256;           // width (0 means 256)
            out[e + 1] = size % 256;       // height
            out[e + 2] = 0;                // palette size
            out[e + 3] = 0;                // reserved
            view.setUint16(e + 4, 1, true);   // planes
            view.setUint16(e + 6, 32, true);  // bits per pixel
            view.setUint32(e + 8, png.length, true);
            view.setUint32(e + 12, offset, true);
            out.set(png, offset);
            offset += png.length;
        });
        return new Blob([out], { type: 'image/x-icon' });
    }

    async function imageToPdf(file, quality) {
        const img = await loadImage(file);
        const { canvas, width, height } = canvasFromImage(img);
        const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', quality);
        const jpeg = new Uint8Array(await jpegBlob.arrayBuffer());
        // 96 px/inch → 72 pt/inch
        return buildPdf([{
            pageWidth: Math.round(width * 0.75 * 100) / 100,
            pageHeight: Math.round(height * 0.75 * 100) / 100,
            image: { bytes: jpeg, pxWidth: width, pxHeight: height }
        }]);
    }

    // ---------- PDF ----------
    // Builds a minimal PDF 1.4 file. `pages` items are either
    // { pageWidth, pageHeight, image: {bytes, pxWidth, pxHeight} } (JPEG) or
    // { pageWidth, pageHeight, content: string } (pre-built text operators).
    function buildPdf(pages) {
        const objects = []; // { body: string } or { stream: Uint8Array }
        const add = (body) => (objects.push({ body }), objects.length); // returns obj number

        const catalogNum = add('');
        const pagesNum = add('');
        const kids = [];
        for (const page of pages) {
            const contentsNum = add('');
            let imageNum = 0;
            if (page.image) {
                imageNum = add('');
            }
            const pageNum = add('');
            kids.push(pageNum);

            let stream;
            if (page.image) {
                stream = 'q\n' + page.pageWidth + ' 0 0 ' + page.pageHeight + ' 0 0 cm\n/Im0 Do\nQ\n';
            } else {
                stream = page.content;
            }
            objects[contentsNum - 1] = { stream: latin1Bytes(stream) };

            let resources = '<< /ProcSet [/PDF /ImageC]';
            if (page.image) {
                resources += ' /XObject << /Im0 ' + imageNum + ' 0 R >> >>';
            } else {
                resources += ' >>';
            }

            objects[pageNum - 1] = {
                body: '<< /Type /Page /Parent ' + pagesNum + ' 0 R /MediaBox [0 0 ' +
                    page.pageWidth + ' ' + page.pageHeight + '] /Resources ' + resources +
                    ' /Contents ' + contentsNum + ' 0 R >>'
            };
            if (page.image) {
                objects[imageNum - 1] = {
                    stream: page.image.bytes,
                    dict: '<< /Type /XObject /Subtype /Image /Width ' + page.image.pxWidth +
                        ' /Height ' + page.image.pxHeight + ' /ColorSpace /DeviceRGB' +
                        ' /BitsPerComponent 8 /Filter /DCTDecode /Length ' + page.image.bytes.length + ' >>'
                };
            }
        }

        objects[catalogNum - 1] = { body: '<< /Type /Catalog /Pages ' + pagesNum + ' 0 R >>' };
        objects[pagesNum - 1] = {
            body: '<< /Type /Pages /Kids [' + kids.map((k) => k + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>'
        };

        return assemblePdf(objects);
    }

    function assemblePdf(objects) {
        const chunks = [latin1Bytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')];
        let position = chunks[0].length;
        const offsets = [];

        objects.forEach((obj, i) => {
            offsets.push(position);
            if (obj.dict) {
                const head = latin1Bytes(i + 1 + ' 0 obj\n' + obj.dict + '\nstream\n');
                const tail = latin1Bytes('\nendstream\nendobj\n');
                chunks.push(head, obj.stream, tail);
                position += head.length + obj.stream.length + tail.length;
            } else if (obj.stream !== undefined) {
                const head = latin1Bytes(i + 1 + ' 0 obj\n<< /Length ' + obj.stream.length + ' >>\nstream\n');
                const tail = latin1Bytes('\nendstream\nendobj\n');
                chunks.push(head, obj.stream, tail);
                position += head.length + obj.stream.length + tail.length;
            } else {
                const body = latin1Bytes(i + 1 + ' 0 obj\n' + obj.body + '\nendobj\n');
                chunks.push(body);
                position += body.length;
            }
        });

        const xrefStart = position;
        let xref = 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
        for (const off of offsets) xref += String(off).padStart(10, '0') + ' 00000 n \n';
        const trailer = 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF\n';
        chunks.push(latin1Bytes(xref + trailer));
        return new Blob(chunks, { type: 'application/pdf' });
    }

    function latin1Bytes(text) {
        const out = new Uint8Array(text.length);
        for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xFF;
        return out;
    }

    // ---------- Text → PDF ----------
    const PDF_PAGE_W = 612;  // US Letter, points
    const PDF_PAGE_H = 792;
    const PDF_MARGIN = 56;
    const PDF_LINE_H = 15.5;

    let measureCtx = null;
    function textWidth(text, size, bold) {
        if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
        measureCtx.font = size + 'px ' + (bold ? 'Arial' : 'Helvetica') + ', Arial, sans-serif';
        return measureCtx.measureText(text).width * 0.94; // Helvetica runs slightly narrow
    }

    async function convertText(baseName, entry) {
        const text = await entry.file.text();
        const lines = layoutTextPages(text);
        const content = lines.join('\n');
        const blob = buildTextPdf(content);
        return { blob, name: baseName + '.pdf', note: lines.length + ' lines' };
    }

    function buildTextPdf(contentStream) {
        // Object layout used by this single-page-per-file text PDF:
        // 1 catalog, 2 pages, 3 content, 4 page, 5 F1, 6 F2
        const objects = [
            { body: '<< /Type /Catalog /Pages 2 0 R >>' },
            { body: '<< /Type /Pages /Kids [4 0 R] /Count 1 >>' },
            { stream: latin1Bytes(contentStream) },
            { body: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PDF_PAGE_W + ' ' + PDF_PAGE_H +
                '] /Resources << /ProcSet [/PDF /Text] /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 3 0 R >>' },
            { body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>' },
            { body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>' }
        ];
        return assemblePdf(objects);
    }

    function layoutTextPages(text) {
        const maxWidth = PDF_PAGE_W - PDF_MARGIN * 2;
        const ops = [];
        let y = PDF_PAGE_H - PDF_MARGIN;
        const pushLine = (text, size, bold) => {
            if (y < PDF_MARGIN) return; // single-page limit keeps things simple
            const escaped = pdfEscape(text);
            ops.push('BT /' + (bold ? 'F2' : 'F1') + ' ' + size + ' Tf ' + PDF_MARGIN + ' ' +
                y.toFixed(1) + ' Td (' + escaped + ') Tj ET');
            y -= text === '' ? PDF_LINE_H * 0.6 : PDF_LINE_H * (size / 11);
        };

        for (const rawLine of text.split(/\r\n|\r|\n/)) {
            let line = rawLine.replace(/\t/g, '    ').replace(/\u00A0/g, ' ');
            let size = 11;
            let bold = false;
            const heading = line.match(/^(#{1,6})\s+(.*)$/);
            if (heading) {
                size = heading[1].length <= 2 ? 16 : 13;
                bold = true;
                line = heading[2];
            } else {
                line = line.replace(/^[-*+]\s+/, '\u2022 ').replace(/`/g, '');
            }
            line = winAnsi(line);

            if (line === '') { pushLine('', size, bold); continue; }
            const words = line.split(' ');
            let current = '';
            for (const word of words) {
                const candidate = current ? current + ' ' + word : word;
                if (textWidth(candidate, size, bold) <= maxWidth) {
                    current = candidate;
                } else {
                    if (current) pushLine(current, size, bold);
                    current = word;
                }
            }
            if (current) pushLine(current, size, bold);
        }
        return ops;
    }

    function winAnsi(text) {
        return text
            .replace(/[\u2018\u2019\u201A]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2013]/g, '-')
            .replace(/[\u2014]/g, '--')
            .replace(/\u2026/g, '...')
            .replace(/\u2022/g, '\x95') // WinAnsi bullet
            .replace(/[^\x00-\xFF]/g, '?');
    }

    function pdfEscape(text) {
        return text.replace(/[\\()]/g, '\\$&');
    }

    // ---------- Data (CSV / TSV / JSON) ----------
    async function convertData(baseName, entry) {
        const target = dataFormatSel.value;
        const ext = (entry.file.name.split('.').pop() || '').toLowerCase();
        const sourceIsJson = ext === 'json';

        if (target === 'json') {
            if (sourceIsJson) return { blob: null, name: '', note: 'already JSON' };
            const text = await entry.file.text();
            const rows = parseDelimited(text, ext === 'tsv' ? '\t' : sniffDelimiter(text));
            const json = tableToJson(rows);
            const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
            return { blob, name: baseName + '.json', note: json.length + ' rows' };
        }
        // target CSV
        if (!sourceIsJson) return { blob: null, name: '', note: 'already CSV/TSV' };
        const text = await entry.file.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error('Invalid JSON file.');
        }
        const csv = jsonToCsv(data, ',');
        const blob = new Blob([csv], { type: 'text/csv' });
        return { blob, name: baseName + '.csv', note: csv.split('\n').length - 1 + ' rows' };
    }

    function sniffDelimiter(text) {
        const line = text.split(/\r?\n/)[0] || '';
        const counts = { ',': (line.match(/,/g) || []).length, ';': (line.match(/;/g) || []).length, '\t': (line.match(/\t/g) || []).length };
        return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || ',';
    }

    function parseDelimited(text, delim) {
        const rows = [];
        let row = [];
        let field = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (inQuotes) {
                if (c === '"') {
                    if (text[i + 1] === '"') { field += '"'; i++; }
                    else inQuotes = false;
                } else {
                    field += c;
                }
            } else if (c === '"') {
                inQuotes = true;
            } else if (c === delim) {
                row.push(field); field = '';
            } else if (c === '\n' || c === '\r') {
                if (c === '\r' && text[i + 1] === '\n') i++;
                row.push(field); field = '';
                if (row.length > 1 || row[0] !== '') rows.push(row);
                row = [];
            } else {
                field += c;
            }
        }
        row.push(field);
        if (row.length > 1 || row[0] !== '') rows.push(row);
        return rows;
    }

    function coerceCell(value) {
        const v = value.trim();
        if (v === '') return null;
        if (v === 'true') return true;
        if (v === 'false') return false;
        if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(v) && !/^0\d/.test(v)) return Number(v);
        return v;
    }

    function tableToJson(rows) {
        if (!rows.length) return [];
        const headers = rows[0].map((h, i) => (h && h.trim()) || 'col' + (i + 1));
        const seen = {};
        const names = headers.map((h) => {
            seen[h] = (seen[h] || 0) + 1;
            return seen[h] > 1 ? h + '_' + seen[h] : h;
        });
        return rows.slice(1).map((row) => {
            const obj = {};
            names.forEach((name, i) => { obj[name] = coerceCell(row[i] != null ? row[i] : ''); });
            return obj;
        });
    }

    function jsonToCsv(data, delim) {
        if (data == null) return '';
        if (!Array.isArray(data)) data = [data];
        const scalar = data.some((row) => typeof row !== 'object' || row === null);
        const escape = (value) => {
            if (value == null) return '';
            const s = typeof value === 'object' ? JSON.stringify(value) : String(value);
            return /["\n\r,;\t]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        };
        const lines = [];
        if (scalar) {
            lines.push('value');
            data.forEach((v) => lines.push(escape(v)));
        } else {
            const headers = [];
            data.forEach((row) => {
                Object.keys(row).forEach((key) => { if (!headers.includes(key)) headers.push(key); });
            });
            lines.push(headers.map(escape).join(delim));
            data.forEach((row) => {
                lines.push(headers.map((h) => escape(row[h])).join(delim));
            });
        }
        return lines.join('\n') + '\n';
    }

    // ---------- ZIP ----------
    const CRC_TABLE = (() => {
        const table = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
            table[n] = c >>> 0;
        }
        return table;
    })();

    function crc32(bytes) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    function makeZip(files) {
        const encoder = new TextEncoder();
        const parts = [];
        const central = [];
        let offset = 0;
        const now = new Date();
        const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
        const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

        const used = {};
        for (const file of files) {
            let name = file.name;
            if (used[name]) {
                const dot = name.lastIndexOf('.');
                const stem = dot > 0 ? name.slice(0, dot) : name;
                const ext = dot > 0 ? name.slice(dot) : '';
                let n = 2;
                while (used[stem + '_' + n + ext]) n++;
                name = stem + '_' + n + ext;
            }
            used[name] = true;

            const nameBytes = encoder.encode(name);
            const data = file.data;
            const crc = crc32(data);

            const local = new Uint8Array(30 + nameBytes.length);
            const lv = new DataView(local.buffer);
            lv.setUint32(0, 0x04034B50, true);
            lv.setUint16(4, 20, true);          // version needed
            lv.setUint16(6, 0x0800, true);      // UTF-8 names
            lv.setUint16(8, 0, true);           // stored, no compression
            lv.setUint16(10, dosTime, true);
            lv.setUint16(12, dosDate, true);
            lv.setUint32(14, crc, true);
            lv.setUint32(18, data.length, true);
            lv.setUint32(22, data.length, true);
            lv.setUint16(26, nameBytes.length, true);
            lv.setUint16(28, 0, true);
            local.set(nameBytes, 30);

            parts.push(local, data);

            const entry = new Uint8Array(46 + nameBytes.length);
            const ev = new DataView(entry.buffer);
            ev.setUint32(0, 0x02014B50, true);
            ev.setUint16(4, 20, true);
            ev.setUint16(6, 20, true);
            ev.setUint16(8, 0x0800, true);
            ev.setUint16(10, 0, true);
            ev.setUint16(12, dosTime, true);
            ev.setUint16(14, dosDate, true);
            ev.setUint32(16, crc, true);
            ev.setUint32(20, data.length, true);
            ev.setUint32(24, data.length, true);
            ev.setUint16(28, nameBytes.length, true);
            ev.setUint32(42, offset, true);
            entry.set(nameBytes, 46);
            central.push(entry);

            offset += local.length + data.length;
        }

        const centralSize = central.reduce((sum, c) => sum + c.length, 0);
        const eocd = new Uint8Array(22);
        const ev = new DataView(eocd.buffer);
        ev.setUint32(0, 0x06054B50, true);
        ev.setUint16(8, central.length, true);
        ev.setUint16(10, central.length, true);
        ev.setUint32(12, centralSize, true);
        ev.setUint32(16, offset, true);

        return new Blob([...parts, ...central, eocd], { type: 'application/zip' });
    }

    async function downloadZip() {
        const done = [...entries.values()].filter((e) => e.status === 'done' && e.blob);
        if (!done.length) return;
        const files = [];
        for (const entry of done) {
            files.push({
                name: entry.outName || stripExtension(entry.file.name) + '.out',
                data: new Uint8Array(await entry.blob.arrayBuffer())
            });
        }
        const blob = makeZip(files);
        triggerDownload(blob, 'conversions.zip');
        showToast('Zipped ' + files.length + ' result' + (files.length === 1 ? '' : 's') + '.');
    }

    // ---------- Downloads ----------
    function downloadEntry(entry) {
        if (!entry.blob) return;
        triggerDownload(entry.blob, entry.outName || ('converted.' + audioFormatSel.value));
    }

    function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
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
        if (/decod/i.test(msg)) {
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
