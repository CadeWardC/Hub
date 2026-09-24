const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext({viewport:{width:390,height:844}});
    await context.addInitScript(() => {
      window.__clips = [];
      window.Audio = class {
        constructor() { window.__audio = this; }
        play() { window.__clips.push(this.src); return Promise.resolve(); }
        pause() {} removeAttribute() {} load() {}
      };
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.STORYTIME_URL || 'http://127.0.0.1:8765/StoryTime/');
    await page.locator('#listening-tab').click();
    assert(await page.locator('#library').isHidden());
    assert.equal(await page.locator('#listening-transcript').textContent(), '');
    assert.equal(await page.locator('#listening-choices button:disabled').count(), 3);
    await page.locator('#listening-play').click();
    assert.equal(await page.evaluate(() => __audio.playbackRate), 1);
    await page.evaluate(() => { window.__stale = __audio.onended; __audio.onended(); });
    assert.equal(await page.locator('#listening-choices button:disabled').count(), 3);
    await page.evaluate(() => __audio.onended());
    await page.getByRole('button', {name:'Reading at home', exact:true}).click();
    assert.match(await page.locator('#listening-feedback').textContent(), /^Correct!/);
    assert.equal(await page.locator('#listening-choices button:disabled').count(), 3);
    assert(await page.locator('#listening-review').isVisible());
    await page.locator('#listening-next').click();
    assert.equal(await page.locator('#listening-transcript').textContent(), '');
    await page.evaluate(() => __stale());
    assert.equal(await page.locator('#listening-choices button:disabled').count(), 3);
    await page.locator('#listening-play').click();
    await page.evaluate(() => { __audio.onended(); __audio.onended(); });
    await page.getByRole('button', {name:'One', exact:true}).click();
    assert.match(await page.locator('#listening-feedback').textContent(), /^Not quite/);
    assert.match(await page.locator('.listening-choices .correct').textContent(), /Two/);
    const expected = {beginner:[2,2,2,2,2,2], intermediate:[4,3,4,4,4,4]};
    for (const level of ['intermediate','beginner']) {
      await page.locator('#listening-level').selectOption(level);
      for (const length of expected[level]) {
        await page.locator('#listening-play').click();
        assert.match(await page.locator('#listening-status').textContent(), new RegExp(`of ${length} sentences`));
        for (let i = 0; i < length; i++) await page.evaluate(() => __audio.onended());
        assert.equal(await page.locator('#listening-choices button:disabled').count(),0);
        if (level === 'intermediate') assert.match(await page.locator('#listening-choices').textContent(), /[\u4e00-\u9fff]/);
        await page.locator('#listening-choices button').first().click();
        await page.locator('#listening-next').click();
      }
      assert.match(await page.locator('#listening-progress').textContent(), /Question 1 of 6 · 0 correct/);
    }
    await page.locator('#listening-play').click();
    await page.evaluate(() => { window.__stale = __audio.onended; });
    await page.locator('#stories-tab').click();
    const count = await page.evaluate(() => __clips.length);
    await page.evaluate(() => __stale());
    assert.equal(await page.evaluate(() => __clips.length),count);
    await page.locator('#listening-tab').click();
    await page.locator('#listening-play').click();
    await page.evaluate(() => __audio.onerror());
    assert.match(await page.locator('#listening-status').textContent(), /could not play/);
    assert.equal(await page.locator('#listening-choices button:disabled').count(),3);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'storytime-listening.png'),fullPage:true});
    await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.active);
    await page.reload();
    await context.setOffline(true);
    await page.reload();
    await page.locator('#listening-tab').click();
    await page.locator('#listening-play').click();
    assert(await page.evaluate(async () => (await fetch(__audio.src)).ok));
    assert.deepEqual(errors,[]);
    console.log('Listening tests passed: all 12 passages, grading, hidden text, cancellation, errors, mobile, offline.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
