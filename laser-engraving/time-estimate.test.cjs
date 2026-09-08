const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { window: {}, console, document: { addEventListener() {}, getElementById() { return null; } } };
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname + '/script.js', 'utf8').replace(
    "document.addEventListener('DOMContentLoaded', init);", 'window.CADApp = CADApp;'), context);
const app = Object.create(context.window.CADApp.prototype);
app.bed = { x: 400, y: 400 };
const rect = { type: 'rect', x: 0, y: 0, width: 30, height: 20, mode: 'cut', power: 50, speed: 100, passes: 1 };

test('cut time follows perimeter, preset speed and passes; rotation preserves time', () => {
    assert.equal(app.estimateObjectSeconds(rect), 60);
    assert.equal(app.estimateObjectSeconds({ ...rect, speed: 200, passes: 3, rotation: 45 }), 90);
    assert.equal(app.estimateObjectSeconds({ ...rect, type: 'ellipse', width: 20, height: 20 }), 12 * Math.PI);
    assert.equal(app.estimateObjectSeconds({ ...rect, type: 'polyline', points: [{ x: 0, y: 0 }, { x: 3, y: 4 }] }), 3);
});

test('filled vector estimate matches exported scan distances', () => {
    for (const type of ['rect', 'ellipse']) {
        const obj = { ...rect, type, mode: 'engrave', passes: 2, rotation: 37 };
        const lines = type === 'rect' ? app.generateRectMoves(obj) : app.generateEllipseMoves(obj);
        let x = 0, y = 0, distance = 0;
        for (const line of lines) {
            const nx = Number(/ X(-?[\d.]+)/.exec(line)[1]);
            const ny = Number(/ Y(-?[\d.]+)/.exec(line)[1]);
            if (line.startsWith('G1 ')) distance += Math.hypot(nx - x, ny - y);
            x = nx; y = ny;
        }
        assert.ok(Math.abs(app.estimateObjectSeconds(obj) - distance / obj.speed * 60) < 0.1);
    }
});

test('raster estimates follow export resolution and reject missing settings', () => {
    assert.equal(app.estimateObjectSeconds({ ...rect, type: 'image' }), null);
    assert.equal(app.estimateObjectSeconds({ ...rect, type: 'text', fontSize: 10, text: 'Hello' }), 2160);
    assert.equal(app.estimateObjectSeconds({ ...rect, type: 'text', fontSize: 10, text: '' }), 0);
    for (const speed of [0, undefined, NaN, Infinity]) assert.equal(app.estimateObjectSeconds({ ...rect, speed }), null);
});

test('summary handles total, hidden items, missing settings and empty layouts', async () => {
    app.dom = { timeEstimate: {}, timeEstimateMissing: {} };
    app.objects = [rect, { ...rect, visible: false }, { ...rect, speed: 0 }];
    await app.updateTimeEstimate();
    assert.equal(app.dom.timeEstimate.textContent, 'Partial estimate: ~1m 0s');
    assert.match(app.dom.timeEstimateMissing.textContent, /1 item excluded/);
    app.objects = [rect, rect];
    await app.updateTimeEstimate();
    assert.equal(app.dom.timeEstimate.textContent, 'Estimated time: ~2m 0s');
    assert.equal(app.dom.timeEstimateMissing.textContent, '');
    app.objects = [{ ...rect, power: 0 }];
    await app.updateTimeEstimate();
    assert.match(app.dom.timeEstimate.textContent, /Choose a preset/);
    app.objects = [];
    await app.updateTimeEstimate();
    assert.equal(app.dom.timeEstimate.textContent, 'Add items to estimate time');
});

test('outdated image estimates cannot replace newer totals and pauses are excluded', async () => {
    const isolated = Object.create(context.window.CADApp.prototype);
    isolated.dom = { timeEstimate: {}, timeEstimateMissing: {} };
    const picture = { ...rect, type: 'image', pauseAtSplit: true };
    let finish;
    isolated.estimateImageSeconds = () => new Promise(resolve => { finish = resolve; });
    isolated.objects = [picture];
    const pending = isolated.updateTimeEstimate();
    isolated.objects = [rect];
    await isolated.updateTimeEstimate();
    finish(999);
    await pending;
    assert.equal(isolated.dom.timeEstimate.textContent, 'Estimated time: ~1m 0s');
    isolated.objects = [picture];
    isolated.estimateImageSeconds = async () => 30;
    await isolated.updateTimeEstimate();
    assert.equal(isolated.dom.timeEstimate.textContent, 'Estimated time: ~30s');
    assert.match(isolated.dom.timeEstimateMissing.textContent, /Manual pause time is not included/);
    isolated.estimateImageSeconds = async () => { throw new Error('bad image'); };
    await isolated.updateTimeEstimate();
    assert.equal(isolated.dom.timeEstimate.textContent, 'Could not estimate image time');
});
