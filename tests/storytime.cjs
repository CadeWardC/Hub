// Run with a local Hub server and Playwright available:
// STORYTIME_URL=http://127.0.0.1:8765/StoryTime/ node tests/storytime.cjs
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      window.__speech = [];
      Object.defineProperty(window, 'speechSynthesis', {value: {
        cancel() {}, resume() {}, addEventListener() {}, getVoices() { return [{name:'Test Mandarin',lang:'zh-CN',voiceURI:'test',localService:true}]; },
        speak(u) { window.__speech.push(u); u.onstart?.(); }
      }});
      window.SpeechSynthesisUtterance = class { constructor(text) { this.text=text; } };
    });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', e=>errors.push(e.message));
    await page.goto(process.env.STORYTIME_URL || 'http://127.0.0.1:8765/StoryTime/');
    assert.equal(await page.locator('.story-card').count(),2);
    await page.locator('.story-card').first().click();
    await page.locator('#play').click();
    assert.equal(await page.evaluate(()=>__speech.at(-1).rate),.65);
    await page.evaluate(()=>__speech.at(-1).onboundary({charIndex:1,charLength:1}));
    assert.equal(await page.locator('mark').textContent(),'叫');
    await page.evaluate(()=>__speech.at(-1).onend());
    assert.match(await page.locator('#position').textContent(), /Sentence 2/);
    await page.locator('#speed').selectOption('0.5');
    assert.equal(await page.evaluate(()=>__speech.at(-1).rate),.5);
    await page.evaluate(()=>__speech.at(-2).onend()); // Canceled speech must not advance.
    assert.match(await page.locator('#position').textContent(), /Sentence 2/);
    await page.locator('#play').click();
    await page.locator('#step-mode').check();
    await page.locator('#play').click();
    const before = await page.evaluate(()=>__speech.length);
    await page.evaluate(()=>__speech.at(-1).onend());
    assert.equal(await page.evaluate(()=>__speech.length),before);
    assert.match(await page.locator('#play').textContent(),/Listen/);
    await page.locator('#reader-difficulty').selectOption('tea-advanced');
    assert.match(await page.locator('#reader-level').textContent(),/advanced/);
    await page.locator('#support').selectOption('hanzi');
    assert.equal(await page.locator('.english,.pinyin').count(),0);
    assert.equal(await page.locator('#add-story,#editor,#edit-story,#import-file').count(),0);
    await page.locator('#complete').click();
    await page.reload();
    assert.equal(await page.locator('.story-card').count(),2);
    assert.match(await page.locator('#read-count').textContent(),/1 story read/);
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
    await page.screenshot({path:'/tmp/storytime-mobile.png',fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    await page.locator('[data-level="beginner"]').click();
    await page.screenshot({path:'/tmp/storytime-desktop.png',fullPage:true});
    await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.active);
    await page.evaluate(async()=>{await caches.open('other-app-test');});
    await page.reload();
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    await context.setOffline(true); await page.reload();
    assert.equal(await page.locator('.story-card').count(),2);
    assert.equal(await page.evaluate(()=>caches.has('other-app-test')),true);
    assert.deepEqual(errors,[]);
    await context.setOffline(false);
    await context.close();
    // No speech API and blocked storage should still permit reading.
    const fallback = await browser.newContext();
    await fallback.addInitScript(()=>{
      Object.defineProperty(window,'speechSynthesis',{value:undefined});
      Storage.prototype.setItem = ()=>{throw Error('blocked');};
    });
    const p = await fallback.newPage(); await p.goto(process.env.STORYTIME_URL || 'http://127.0.0.1:8765/StoryTime/');
    await p.locator('.story-card').first().click();
    assert.equal(await p.locator('#play').isDisabled(),true);
    await p.locator('#complete').click();
    assert.equal(await p.locator('.sentence').count(),await p.evaluate(()=>window.STORYTIME_STORIES[0].sentences.length));
    await fallback.close();
    console.log('PASS: levels, speech synchronization/cancellation/rate/step mode, support, file-backed library, progress persistence, mobile overflow, offline cache, unsupported speech/storage.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1);});
