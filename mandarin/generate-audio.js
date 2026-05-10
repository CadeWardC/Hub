import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const tts = require('@google-cloud/text-to-speech');

const client = new tts.TextToSpeechClient();

const { VOCAB } = await import('./data.js');

const audioDir = path.join(process.cwd(), 'audio');
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir);

const total = VOCAB.length;
let done = 0;
let skipped = 0;
let failed = 0;

for (const word of VOCAB) {
  const filename = `${word.char}.mp3`;
  const filepath = path.join(audioDir, filename);

  if (fs.existsSync(filepath)) {
    skipped++;
    done++;
    continue;
  }

  try {
    const [response] = await client.synthesizeSpeech({
      input: { text: word.char },
      voice: { languageCode: 'cmn-CN', name: 'cmn-CN-Wavenet-A' },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.85 },
    });
    fs.writeFileSync(filepath, response.audioContent, 'binary');
    done++;
    process.stdout.write(`\r[${done}/${total}] ${filename} (skipped: ${skipped}, failed: ${failed})`);
  } catch (err) {
    failed++;
    console.error(`\nFailed: ${word.char} — ${err.message}`);
  }

  await new Promise(r => setTimeout(r, 100));
}

console.log(`\nDone. Generated: ${done - skipped}, Skipped: ${skipped}, Failed: ${failed}`);
