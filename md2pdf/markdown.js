/* ============================================================
   Minimal, dependency-free Markdown -> HTML renderer.
   Supports: headings, bold/italic/strikethrough, inline code,
   fenced & indented code blocks, links, images, ordered &
   unordered lists (nested), task lists, blockquotes, tables,
   horizontal rules, and paragraphs. Runs fully offline.
   ============================================================ */
(function (global) {
    'use strict';

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Inline-level formatting applied within a block of text.
    function renderInline(text) {
        // Placeholders protect content that must not be re-parsed. The
        // NUL (U+0000) delimiter can't appear in pasted Markdown, so
        // restoration never collides with literal numbers in the text.
        var stash = [];
        function hold(html) {
            stash.push(html);
            return '\u0000' + (stash.length - 1) + '\u0000';
        }

        // Inline code first — its contents are literal.
        text = text.replace(/`([^`]+)`/g, function (_, code) {
            return hold('<code>' + escapeHtml(code) + '</code>');
        });

        // Escape everything else, then apply formatting on safe text.
        text = escapeHtml(text);

        // Allow literal <br> line breaks (common inside Markdown table
        // cells). Only <br> is un-escaped — everything else stays inert.
        text = text.replace(/&lt;br\s*\/?&gt;/gi, '<br>');

        // Images: ![alt](src "title")
        text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
            function (_, alt, src, title) {
                var t = title ? ' title="' + title + '"' : '';
                return hold('<img src="' + src + '" alt="' + alt + '"' + t + '>');
            });

        // Links: [text](href "title")
        text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
            function (_, label, href, title) {
                var t = title ? ' title="' + title + '"' : '';
                return hold('<a href="' + href + '"' + t + ' target="_blank" rel="noopener">' + label + '</a>');
            });

        // Bold + italic combos
        text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        text = text.replace(/(^|[\s(])_([^_]+)_($|[\s.,;:!?)])/g, '$1<em>$2</em>$3');
        text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');

        // Hard line break (two trailing spaces handled by caller); lone breaks
        text = text.replace(/\n/g, '<br>');

        // Restore protected spans.
        text = text.replace(/\u0000(\d+)\u0000/g, function (_, i) {
            return stash[Number(i)];
        });
        return text;
    }

    // A GitHub-style table separator, e.g. "| :--- | ---: |".
    function isTableSep(s) {
        return typeof s === 'string' &&
            /^\s*\|?[\s:|-]+\|?\s*$/.test(s) &&
            s.indexOf('-') !== -1;
    }

    // True when lines[idx] is a table header (has a pipe) whose next line
    // is a separator row. Used so paragraph gathering stops at a table even
    // when no blank line precedes it.
    function isTableStart(lines, idx) {
        return idx + 1 < lines.length &&
            lines[idx].indexOf('|') !== -1 &&
            isTableSep(lines[idx + 1]);
    }

    function parseTable(lines, start) {
        // lines[start] is header, lines[start+1] is the |---|---| separator.
        var sep = lines[start + 1];
        if (!isTableSep(sep)) {
            return null;
        }
        function cells(row) {
            return row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (c) {
                return c.trim();
            });
        }
        var aligns = cells(sep).map(function (c) {
            var l = c.charAt(0) === ':';
            var r = c.charAt(c.length - 1) === ':';
            if (l && r) return 'center';
            if (r) return 'right';
            if (l) return 'left';
            return '';
        });
        var head = cells(lines[start]);
        var i = start + 2;
        var body = [];
        while (i < lines.length && lines[i].indexOf('|') !== -1 && lines[i].trim() !== '') {
            body.push(cells(lines[i]));
            i++;
        }
        var html = '<table><thead><tr>';
        head.forEach(function (c, idx) {
            var a = aligns[idx] ? ' style="text-align:' + aligns[idx] + '"' : '';
            html += '<th' + a + '>' + renderInline(c) + '</th>';
        });
        html += '</tr></thead><tbody>';
        body.forEach(function (row) {
            html += '<tr>';
            row.forEach(function (c, idx) {
                var a = aligns[idx] ? ' style="text-align:' + aligns[idx] + '"' : '';
                html += '<td' + a + '>' + renderInline(c) + '</td>';
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        return { html: html, next: i };
    }

    // Build nested lists from consecutive list lines using indentation.
    function parseList(lines, start) {
        var items = [];
        var i = start;
        var re = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
        var firstIndent = null;
        var ordered = /\d/.test((lines[start].match(re) || [])[2] || '');

        while (i < lines.length) {
            var m = lines[i].match(re);
            if (!m) {
                // Allow blank line then continued list; otherwise stop.
                if (lines[i].trim() === '' && i + 1 < lines.length && re.test(lines[i + 1])) {
                    i++;
                    continue;
                }
                break;
            }
            var indent = m[1].length;
            if (firstIndent === null) firstIndent = indent;
            if (indent < firstIndent) break;

            if (indent > firstIndent) {
                // Nested list — recurse and attach to the previous item.
                var nested = parseList(lines, i);
                if (items.length) {
                    items[items.length - 1].children += nested.html;
                }
                i = nested.next;
                continue;
            }

            // A change of marker type at the same level (bullet <-> number)
            // ends this list and starts a new one.
            if (/\d/.test(m[2]) !== ordered) break;

            var content = m[3];
            var task = content.match(/^\[([ xX])\]\s+(.*)$/);
            items.push({
                content: task ? content : content,
                task: task ? task[1].toLowerCase() === 'x' : null,
                taskText: task ? task[2] : null,
                children: ''
            });
            i++;
        }

        var tag = ordered ? 'ol' : 'ul';
        var cls = items.some(function (it) { return it.task !== null; }) ? ' class="task-list"' : '';
        var html = '<' + tag + cls + '>';
        items.forEach(function (it) {
            if (it.task !== null) {
                html += '<li class="task-item"><input type="checkbox" disabled' +
                    (it.task ? ' checked' : '') + '> ' + renderInline(it.taskText) + it.children + '</li>';
            } else {
                html += '<li>' + renderInline(it.content) + it.children + '</li>';
            }
        });
        html += '</' + tag + '>';
        return { html: html, next: i };
    }

    function render(src) {
        var lines = src.replace(/\r\n?/g, '\n').split('\n');
        var out = [];
        var i = 0;

        while (i < lines.length) {
            var line = lines[i];

            // Fenced code block
            var fence = line.match(/^\s*(```+|~~~+)\s*([\w-]*)\s*$/);
            if (fence) {
                var marker = fence[1].charAt(0);
                var lang = fence[2];
                var code = [];
                i++;
                while (i < lines.length && !new RegExp('^\\s*' + marker + '{3,}\\s*$').test(lines[i])) {
                    code.push(lines[i]);
                    i++;
                }
                i++; // skip closing fence
                var langAttr = lang ? ' class="language-' + lang + '"' : '';
                out.push('<pre><code' + langAttr + '>' + escapeHtml(code.join('\n')) + '</code></pre>');
                continue;
            }

            // Blank line
            if (line.trim() === '') { i++; continue; }

            // Horizontal rule
            if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
                out.push('<hr>');
                i++;
                continue;
            }

            // ATX heading
            var h = line.match(/^\s*(#{1,6})\s+(.*?)\s*#*\s*$/);
            if (h) {
                var level = h[1].length;
                out.push('<h' + level + '>' + renderInline(h[2]) + '</h' + level + '>');
                i++;
                continue;
            }

            // Blockquote (supports multi-line)
            if (/^\s*>/.test(line)) {
                var quote = [];
                while (i < lines.length && /^\s*>/.test(lines[i])) {
                    quote.push(lines[i].replace(/^\s*>\s?/, ''));
                    i++;
                }
                out.push('<blockquote>' + render(quote.join('\n')) + '</blockquote>');
                continue;
            }

            // Table
            if (line.indexOf('|') !== -1 && i + 1 < lines.length) {
                var table = parseTable(lines, i);
                if (table) {
                    out.push(table.html);
                    i = table.next;
                    continue;
                }
            }

            // List
            if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
                var list = parseList(lines, i);
                out.push(list.html);
                i = list.next;
                continue;
            }

            // Paragraph — gather until a blank line, a block-starter, or the
            // start of a table (which may butt directly against the text).
            var para = [];
            while (i < lines.length && lines[i].trim() !== '' &&
                !/^\s*(#{1,6}\s|>|```|~~~|([-*+]|\d+[.)])\s|([-*_])(\s*\3){2,}\s*$)/.test(lines[i]) &&
                !isTableStart(lines, i)) {
                para.push(lines[i]);
                i++;
            }
            out.push('<p>' + renderInline(para.join('\n')) + '</p>');
        }

        return out.join('\n');
    }

    global.MD = { render: render };
})(window);
