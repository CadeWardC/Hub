// Run with: node --test laser-engraving/outline.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/script.js', 'utf8');
const context = { window: {}, document: { addEventListener() {}, getElementById() { return null; } }, console };
vm.createContext(context);
vm.runInContext(source.replace('document.addEventListener(\'DOMContentLoaded\', init);',
    'window.testing = { traceOutlineMask, ditherImageData, CADApp };'), context);
const { traceOutlineMask, ditherImageData, CADApp } = context.window.testing;
const mask = (w, h, predicate) => Uint8Array.from({ length: w * h }, (_, i) => +predicate(i % w, Math.floor(i / w)));

test('traces a concave subject, closes paths and excludes interior holes', () => {
    const concave = traceOutlineMask(mask(10, 10, (x, y) => x >= 2 && y >= 2 && x < 8 && y < 8 && (x < 4 || y > 5)), 10, 10, 0);
    assert.equal(concave.length, 1);
    assert.equal(concave[0].length, 7);
    assert.deepEqual(concave[0][0], concave[0].at(-1));
    const ring = traceOutlineMask(mask(10, 10, (x, y) => x >= 2 && y >= 2 && x < 8 && y < 8 && !(x > 3 && x < 6 && y > 3 && y < 6)), 10, 10, 0);
    assert.equal(ring.length, 1);
    assert.equal(ring[0].length, 5);
});

test('disk padding matches brute-force Euclidean distance for fractional radii', () => {
    for (const radius of [0.5, 1, 1.5, 2.75, 4]) {
        const w = 18, h = 16, seeds = [[6, 6], [9, 8], [8, 10]];
        const actual = mask(w, h, (x, y) => seeds.some(([a, b]) => x === a && y === b));
        traceOutlineMask(actual, w, h, radius);
        const expected = mask(w, h, (x, y) => seeds.some(([a, b]) => (x - a) ** 2 + (y - b) ** 2 <= radius ** 2));
        assert.deepEqual(actual, expected);
    }
});

test('diagonally touching subjects stay separate; blank images have no outline', () => {
    assert.equal(traceOutlineMask(mask(5, 5, (x, y) => x === y && x > 0 && x < 4), 5, 5, 0).length, 3);
    assert.equal(traceOutlineMask(new Uint8Array(25), 5, 5, 2).length, 0);
});

test('transparent pixels stay invisible during dithering; opaque white details remain intact', () => {
    const image = { width: 3, height: 1, data: new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255]) };
    ditherImageData(image);
    assert.deepEqual([...image.data], [255, 255, 255, 0, 0, 0, 0, 255, 255, 255, 255, 255]);
});

test('outline paths rotate with their image, export closed G-code, and undo together', () => {
    const app = Object.create(CADApp.prototype);
    app.bed = { x: 100, y: 100 };
    const image = { id: 1, type: 'image', x: 10, y: 20, width: 20, height: 10, rotation: 90 };
    const point = app.toWorld(image, 10, 20);
    assert.equal(point.x, 25);
    assert.equal(point.y, 15);
    const outline = { id: 2, type: 'polyline', rotation: 0, power: 0, speed: 1500,
        points: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 3 }, { x: 1, y: 1 }] };
    const moves = app.generatePolylineMoves(outline);
    assert.equal(moves.length, 4);
    assert.match(moves.at(-1), /X1 Y99 S0 F1500/);
    app.objects = [image, outline];
    for (const name of ['renderObjects', 'renderSelection', 'renderLayersPanel', 'updatePropertiesPanel']) app[name] = () => {};
    app.selectObject = id => { app.selectedId = id; };
    const command = { type: 'outline', objects: [outline] };
    app.applyCommand(command, true);
    assert.equal(app.objects.length, 1);
    app.applyCommand(command, false);
    assert.equal(app.objects.length, 2);
    assert.equal(JSON.stringify(app.objects[1].points), JSON.stringify(outline.points));
});
