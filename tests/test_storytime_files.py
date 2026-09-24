"""File authoring and build regressions. Run with unittest discover."""
import importlib.util
import json
import hashlib
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'StoryTime'
spec = importlib.util.spec_from_file_location('story_builder', ROOT / 'build_stories.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class StoryFilesTest(unittest.TestCase):
    def parse(self, text):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'my-story.txt'
            path.write_text(text, encoding='utf-8')
            return builder.parse_story(path)

    def test_minimum_and_optional_translations(self):
        story = self.parse('title: Hello\nlevel: beginner\n---\n你好！\n我喝茶。 | | I drink tea.\n')
        self.assertEqual(story['id'], 'my-story')
        self.assertEqual(story['sentences'], [{'zh': '你好！'}, {'zh': '我喝茶。', 'pinyin': '', 'en': 'I drink tea.'}])

    def test_comments_unicode_and_punctuation(self):
        story = self.parse('# comment\ntitle: Tea: a story\nlevel: advanced\n---\n\n# skip\n“你好！” | “Nǐ hǎo!” | “Hello!”\n')
        self.assertEqual(len(story['sentences']), 1)
        self.assertEqual(story['title'], 'Tea: a story')

    def test_errors_explain_file_and_line(self):
        for text in ['title: Hi\nlevel: easy\n---\n你好', 'title: Hi\nlevel: beginner\n你好', 'title: Hi\nlevel: beginner\n---\n| bad', 'title: Hi\nlevel: beginner\n---\n你|a|b|c']:
            with self.subTest(text=text), self.assertRaisesRegex(ValueError, 'my-story.txt:[0-9]+:'):
                self.parse(text)

    def test_build_detects_new_files_and_updates_cache(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'stories').mkdir()
            for name in ('index.html', 'app.js', 'listening.js', 'styles.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'sw.js'):
                (root / name).write_bytes((ROOT / name).read_bytes())
            (root / 'stories' / '_template.txt').write_text('ignored')
            path = root / 'stories' / 'hello.txt'
            path.write_text('title: Hello\nlevel: beginner\n---\n你好！', encoding='utf-8')
            self.assertEqual(builder.compile_library(root), 1)
            first_cache = (root / 'sw.js').read_text(encoding='utf-8')
            builder.compile_library(root)
            self.assertEqual(first_cache, (root / 'sw.js').read_text(encoding='utf-8'))
            (root / 'stories' / 'tea.txt').write_text('title: Tea\nlevel: intermediate\n---\n我喝茶。', encoding='utf-8')
            self.assertEqual(builder.compile_library(root), 2)
            self.assertNotEqual(first_cache, (root / 'sw.js').read_text(encoding='utf-8'))
            self.assertIn('我喝茶。', (root / 'stories.js').read_text(encoding='utf-8'))
            previous = (root / 'stories.js').read_text(encoding='utf-8')
            path.write_text('invalid')
            with self.assertRaises(ValueError):
                builder.compile_library(root)
            self.assertEqual(previous, (root / 'stories.js').read_text(encoding='utf-8'))

    def test_existing_stories_and_template(self):
        for path in (ROOT / 'stories').glob('*.txt'):
            if path.name.startswith('_'):
                # Template uses an intentionally ignored filename; check its contents.
                self.parse(path.read_text(encoding='utf-8'))
            else:
                builder.parse_story(path)

    def test_audio_requires_matching_text_and_existing_local_clip(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'stories').mkdir()
            (root / 'audio').mkdir()
            for name in ('index.html', 'app.js', 'listening.js', 'styles.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'sw.js'):
                (root / name).write_bytes((ROOT / name).read_bytes())
            source = 'audio/' + 'a' * 24 + '.wav'
            (root / source).write_bytes(b'test audio')
            slow_source = 'audio/' + 'b' * 24 + '.wav'
            (root / slow_source).write_bytes(b'test slow audio')
            path = root / 'stories' / 'hello.txt'
            path.write_text('title: Hello\nlevel: beginner\n---\n你好！', encoding='utf-8')
            manifest = {'stories': {'hello': [{'zh': '你好！', 'src': source, 'speeds': {'0.65': {'src': slow_source}}}]}}
            (root / 'audio' / 'manifest.json').write_text(json.dumps(manifest), encoding='utf-8')
            words = [{'text': '你好', 'offset': 0, 'pinyin': 'nǐ hǎo', 'meanings': ['hello'], 'start': 0, 'end': 1}]
            word_data = {'clips': {src: {'zh': '你好！', 'sha256': hashlib.sha256((root / src).read_bytes()).hexdigest(), 'words': words} for src in (source, slow_source)}}
            (root / 'word-data.json').write_text(json.dumps(word_data), encoding='utf-8')
            builder.compile_library(root)
            self.assertIn('"wordTimings"', (root / 'stories.js').read_text(encoding='utf-8'))
            self.assertIn('"meanings"', (root / 'stories.js').read_text(encoding='utf-8'))
            self.assertIn(source, (root / 'stories.js').read_text(encoding='utf-8'))
            self.assertIn(source, (root / 'sw.js').read_text(encoding='utf-8'))
            self.assertIn(slow_source, (root / 'stories.js').read_text(encoding='utf-8'))
            self.assertIn(slow_source, (root / 'sw.js').read_text(encoding='utf-8'))
            (root / source).write_bytes(b'changed recording with the same name')
            builder.compile_library(root)
            self.assertNotIn('"words"', (root / 'stories.js').read_text(encoding='utf-8'))
            self.assertNotIn('"wordTimings"', (root / 'stories.js').read_text(encoding='utf-8'))
            path.write_text('title: Hello\nlevel: beginner\n---\n再见！', encoding='utf-8')
            builder.compile_library(root)
            self.assertNotIn(source, (root / 'stories.js').read_text(encoding='utf-8'))
            self.assertNotIn(source, (root / 'sw.js').read_text(encoding='utf-8'))
            self.assertNotIn(slow_source, (root / 'stories.js').read_text(encoding='utf-8'))
            self.assertNotIn(slow_source, (root / 'sw.js').read_text(encoding='utf-8'))


if __name__ == '__main__':
    unittest.main()
