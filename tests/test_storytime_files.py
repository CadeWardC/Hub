"""File authoring and build regressions. Run with unittest discover."""
import importlib.util
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
            for name in ('index.html', 'app.js', 'styles.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'sw.js'):
                (root / name).write_bytes((ROOT / name).read_bytes())
            (root / 'stories' / '_template.txt').write_text('ignored')
            path = root / 'stories' / 'hello.txt'
            path.write_text('title: Hello\nlevel: beginner\n---\n你好！', encoding='utf-8')
            self.assertEqual(builder.compile_library(root), 1)
            first_cache = (root / 'sw.js').read_text()
            builder.compile_library(root)
            self.assertEqual(first_cache, (root / 'sw.js').read_text())
            (root / 'stories' / 'tea.txt').write_text('title: Tea\nlevel: intermediate\n---\n我喝茶。', encoding='utf-8')
            self.assertEqual(builder.compile_library(root), 2)
            self.assertNotEqual(first_cache, (root / 'sw.js').read_text())
            self.assertIn('我喝茶。', (root / 'stories.js').read_text())
            previous = (root / 'stories.js').read_text()
            path.write_text('invalid')
            with self.assertRaises(ValueError):
                builder.compile_library(root)
            self.assertEqual(previous, (root / 'stories.js').read_text())

    def test_existing_stories_and_template(self):
        for path in (ROOT / 'stories').glob('*.txt'):
            if path.name.startswith('_'):
                # Template uses an intentionally ignored filename; check its contents.
                self.parse(path.read_text())
            else:
                builder.parse_story(path)


if __name__ == '__main__':
    unittest.main()
