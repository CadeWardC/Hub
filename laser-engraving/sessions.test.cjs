const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/script.js', 'utf8');
let blankRows = new Set([1]);
const context = {
    window: {}, console,
    Image: class { set src(value) { queueMicrotask(() => this.onload()); } },
    document: {
        addEventListener() {}, getElementById() { return null; },
        createElement() {
            return { getContext: () => ({ drawImage() {}, getImageData(x, y, w, h) {
                const data = new Uint8ClampedArray(w * h * 4);
                for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
                    const i = (r * w + c) * 4;
                    data[i] = data[i + 1] = data[i + 2] = (r + c) % 3 * 80;
                    data[i + 3] = blankRows.has(r) ? 0 : 255;
                }
                return { data };
            } }) };
        }
    }
};
vm.createContext(context);
vm.runInContext(source.replace("document.addEventListener('DOMContentLoaded', init);",
    'window.testing = { CADApp, imageSessionRange };'), context);
const { CADApp, imageSessionRange } = context.window.testing;

test('session ranges cover each row exactly once, including odd sizes and extreme splits', () => {
    for (const height of [0.2, 0.5, 1.13, 100]) for (const sessionSplit of [1, 33, 50, 99]) {
        const obj = { height, sessionSplit };
        const a = imageSessionRange(obj, 1), b = imageSessionRange(obj, 2);
        assert.equal(a.start, 0);
        assert.equal(a.end, b.start);
        assert.equal(b.end, Math.round(height / 0.1));
        assert.ok(a.end > 0 && b.end > b.start);
    }
    assert.throws(() => imageSessionRange({ height: 0.1 }, 1), /two scan rows/);
});

function burns(lines, initial) {
    let x = initial.x, y = initial.y;
    const result = [];
    for (const line of lines) {
        if (!/^G[01] /.test(line)) continue;
        const nx = / X(-?[\d.]+)/.exec(line), ny = / Y(-?[\d.]+)/.exec(line);
        const power = / S([\d.]+)/.exec(line);
        const endX = nx ? Number(nx[1]) : x, endY = ny ? Number(ny[1]) : y;
        if (line.startsWith('G1 ') && power && Number(power[1]) > 0) {
            result.push(JSON.stringify([x, y, endX, endY, Number(power[1])].map(v => Math.round(v * 1000) / 1000)));
        }
        x = endX; y = endY;
    }
    return result;
}

test('two sessions preserve original burn segments, scan parity, rotation and passes', async () => {
    const app = Object.create(CADApp.prototype);
    app.bed = { x: 100, y: 100 };
    for (const rotation of [0, 37, 90]) for (const engraveMode of ['dither', 'grayscale']) for (const passes of [1, 2]) {
        const obj = { type: 'image', x: 12, y: 15, width: 0.4, height: 0.7, power: 40,
            speed: 1500, passes, rotation, engraveMode, sessionSplit: 40, href: 'fixture' };
        const initial = app.mp(obj, obj.x, obj.y);
        const full = await app.generateImageMoves(obj);
        const first = await app.generateImageMoves(obj, imageSessionRange(obj, 1));
        const second = await app.generateImageMoves(obj, imageSessionRange(obj, 2));
        assert.equal(first[1], 'S0');
        assert.match(second[2], /^G0 X.* Y/);
        assert.match(second.find(l => l.startsWith('G1 ')), /F1500/);
        assert.equal(second.at(-1), 'M5');
        assert.deepEqual([...burns(first, initial), ...burns(second, initial)].sort(), burns(full, initial).sort());
    }
});

test('blank image rows produce no travel and each pass positions at its first active row', async () => {
    const app = Object.create(CADApp.prototype);
    app.bed = { x: 100, y: 100 };
    const obj = { type: 'image', x: 12, y: 15, width: 0.4, height: 0.7,
        power: 40, speed: 1500, passes: 2, href: 'fixture' };
    try {
        blankRows = new Set([0, 1, 3, 5, 6]);
        const lines = await app.generateImageMoves(obj);
        const travel = lines.filter(l => l.startsWith('G0 '));
        assert.equal(travel.length, 4); // Only two active rows per pass.
        assert.equal(travel[0], 'G0 X12 Y84.8');
        assert.equal(travel[2], travel[0]);
        assert.ok(travel.every(l => /Y84\.[68]$/.test(l)));
        blankRows = new Set([0, 1, 2, 3, 4, 5, 6]);
        const empty = await app.generateImageMoves(obj);
        assert.ok(empty.every(l => !/^G[01] /.test(l)));
        blankRows = new Set();
        const filled = await app.generateImageMoves(obj);
        assert.equal(filled[1], 'G0 X12 Y85');
    } finally {
        blankRows = new Set([1]);
    }
});

test('legacy dither displays recover alpha while current images keep their own alpha', () => {
    const app = Object.create(CADApp.prototype);
    app.scale = 1;
    const obj = { type: 'image', id: 1, x: 0, y: 0, width: 10, height: 10, rotation: 20,
        engraveMode: 'dither', grayscaleHref: 'original-alpha', ditheredHref: 'old-dither' };
    const old = app.objectToSVG(obj);
    assert.match(old, /mask-type:alpha/);
    assert.match(old, /href="original-alpha"/);
    assert.match(old, /mask="url\(#image-alpha-1\)"/);
    assert.doesNotMatch(app.objectToSVG({ ...obj, ditherAlphaPreserved: true }), /<mask/);
    assert.doesNotMatch(app.objectToSVG({ ...obj, engraveMode: 'grayscale' }), /<mask/);
});

test('session download is a standalone file for the selected image with power cleared before M3', async () => {
    const app = Object.create(CADApp.prototype);
    app.bed = { x: 100, y: 100 };
    app.selectedId = 1;
    app.objects = [{ id: 1, name: 'Tiger', type: 'image', x: 10, y: 10, width: 0.4,
        height: 0.7, power: 40, speed: 1500, mode: 'engrave', href: 'fixture' }];
    const status = {}, button = { disabled: false };
    context.document.getElementById = id => id === 'session-status' ? status : { value: '40', reportValidity: () => true };
    let saved;
    app.downloadGC = (content, name) => { saved = { content, name }; };
    await app.exportImageSession(2, button);
    assert.equal(saved.name, 'Tiger-session-2.gc');
    assert.match(saved.content, /Scan rows 4-7 of 7/);
    assert.ok(saved.content.indexOf('S0') < saved.content.indexOf('M3'));
    assert.match(saved.content, /M5\nM9\nG0 X0 Y0$/);
    assert.equal(button.disabled, false);
    assert.match(status.textContent, /downloaded/);
});
