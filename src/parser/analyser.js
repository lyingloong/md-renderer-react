const LF = (s) => s.replace(/\r?\n/g, '\n');

/** --------- 行内解析：返回 [inline nodes...] --------- */
function parseInline(text) {
  const out = [];
  const pushPlain = (s) => { if (s) out.push({ type: 'plain', content: s }); };

  // 统一处理转义：只处理 \[, \], \$，其余保留
  // 注：不要全局清理反斜杠，避免破坏 LaTeX
  const tokenRe = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\\\[(.+?)\\\]|(?<!\\)\$([^$]+)\$|\^((?:[^\\^]|\\\\\^)*)\^|\*([^*]+)\*|__([^_]+)__|_([^_]+)_|\^([^^]+)\^|```([\s\S]+?)```|`([^`]+)`/g;


  let last = 0, m;
  while ((m = tokenRe.exec(text)) !== null) {
    if (m.index > last) pushPlain(text.slice(last, m.index));

    if (m[1] !== undefined) {
      // image
      // !\[([^\]]*)\]\(([^)]+)\)
      out.push({
        type: 'figure',
        path: m[2],
        caption: { 
          type: 'paragraph', 
          content: parseInline(m[1])
        }
      });
    } else if (m[3] !== undefined) {
      // link
      // \[([^\]]+)\]\(([^)]+)\)
      out.push({
        type: 'link',
        text: { type: 'plain', content: m[3] },
        link: m[4]
      });
    } else if (m[5] !== undefined) {
      // display math
      // \\\[(.+?)\\\]
      out.push({ type: 'math', mode: 'display', content: m[5] });
    } else if (m[6] !== undefined) {
      // inline math
      // (?<!\\)\$([^$]+)\$
      out.push({ type: 'math', mode: 'inline', content: m[6] });
    } else if (m[7] !== undefined) {
      out.push({ type: 'bold', content: parseInline(m[7]) });
    } else if (m[8] !== undefined || m[9] !== undefined) {
      const inner = m[8] ?? m[9];
      out.push({ type: 'italic', content: parseInline(inner) });
    } else if (m[10] !== undefined) {
      out.push({ type: 'underlined', content: parseInline(m[10]) });
    }

    last = tokenRe.lastIndex;
  }
  if (last < text.length) pushPlain(text.slice(last));
  return out;
}

/** --------- 块级解析工具 --------- */
const leading = (s) => (s.match(/^[ \t]*/)?.[0] ?? '');
const tabs = (s) => {
  // Tab 优先；四个空格也当成 1 级
  const m = leading(s);
  if (!m) return 0;
  let lvl = 0, i = 0;
  while (i < m.length) {
    if (m[i] === '\t') { lvl++; i++; continue; }
    // 吃尽连续空格
    if (m.substr(i, 4) === '    ') {
      lvl++;
      i += 4;
    } else break;
  }
  return lvl;
};
const trimIndent = (s) => s.replace(/^[ \t]+/, '');

/** Math(display)：以 \[ 开始，\] 结束（可跨行） */
function parseDisplayMath(lines, i) {
  const start = i;
  let body = [];
  while (i < lines.length) {
    body.push(lines[i]);
    if (/^.*\\\]\s*$/.test(lines[i])) { i++; break; }
    i++;
  }
  let content = LF(body.join('\n'));
  content = content.replace(/^\s*\\\[\s*/, '');
  content = content.replace(/\s*\\\]\s*$/, '');
  return [{ type: 'math', mode: 'display', content }, i];
}

/** 解析围栏代码块：```lang[=lineno] ... ``` */
function parseFence(lines, i) {
  const fenceLine = lines[i];
  const m = fenceLine.match(/^\s*```([^\s`]*)\s*$/);
  let lang = '', lineNo;
  if (m) {
    const meta = m[1] || '';
    const mm = meta.match(/^([^=]+?)(?:=(\d+))?$/);
    if (mm) {
      lang = (mm[1] || '').trim();
      if (mm[2]) lineNo = parseInt(mm[2], 10);
    }
  }
  i++;
  const body = [];
  while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
    // 保留缩进（代码内容原样）
    body.push(lines[i]);
    i++;
  }
  if (i < lines.length) i++; // 跳过结尾 ```
  const node = {
    type: 'code-block',
    language: lang,
    content: LF(body.join('\n'))
  };
  if (lineNo !== undefined) node['line-number'] = lineNo;
  return [node, i];
}

/** 解析列表（+ 起始；基于 Tab/空格缩进） */
function parseList(lines, i, baseLevel, ordered = false) {
  const listType = ordered ? 'enumeration' : 'itemization';
  const items = [];

  while (i < lines.length) {
    const line = lines[i];
    const lvl = tabs(line);
    const m = line.match(/^[ \t]*\+\s+(.*)$/);
    if (!m || lvl < baseLevel) break;
    if (lvl > baseLevel) {
      // 上一项的子列表，交给上一项处理
      break;
    }

    // 当前项
    let j = i + 1;
    const titleText = m[1];
    const contentLines = [];

    // 吸收属于此项的后续行
    while (j < lines.length) {
      const l2 = lines[j];
      if (!l2.trim()) { contentLines.push(''); j++; continue; }
      const lvl2 = tabs(l2);
      // 同级下一个 + 列表项，停止
      if (/^[ \t]*\+\s+/.test(l2) && lvl2 === baseLevel) break;
      if (lvl2 < baseLevel) break;
      if (lvl2 === baseLevel && baseLevel == 0 && !/^[ \t]*\+/.test(l2)) break;    // 同级但不是列表项 → 说明是外部内容
      contentLines.push(lines[j]);
      j++;
    }
    
    // 拆分“子列表”和“文本内容”
    const blocks = [];
    let k = 0;
    while (k < contentLines.length) {
      const raw = contentLines[k];
      if (/^[ \t]*\+\s+/.test(raw)) {
        const [subList, nextK] = parseList(contentLines, k, baseLevel + 1, false);
        blocks.push(subList);
        k = nextK;
        continue;
      }
      // 代码块
      if (/^\s*```/.test(raw)) {
        const [codeNode, nextK] = parseFence(contentLines, k);
        blocks.push(codeNode);
        k = nextK;
        continue;
      }
      // 显示数学
      if (/^\s*\\\[.*$/.test(raw)) {
        const [mathNode, nextK] = parseDisplayMath(contentLines, k);
        blocks.push(mathNode);
        k = nextK;
        continue;
      }
      // 普通文本积累到段落（直到遇到结构块/列表）
      const para = [];
      while (
        k < contentLines.length &&
        !/^[ \t]*\+\s+/.test(contentLines[k]) &&
        !/^\s*```/.test(contentLines[k]) &&
        !/^\s*\\\[\s*$/.test(contentLines[k])
      ) {
        para.push(trimIndent(contentLines[k]));
        k++;
      }
      const joined = para.join('\n').trim();
      if (joined) {
        blocks.push({
          type: 'paragraph',
          content: parseInline(joined)
        });
      }
    }

    const parsedTitle = parseInline(titleText);

    items.push({
      type: 'normal-item',
      title: parsedTitle.length === 1 ? parsedTitle[0] : { type: 'span', content: parsedTitle },
      content: blocks
    });

    i = j;
  }

  return [{ type: listType, items }, i];
}

/** 解析表格：| ... | */
function splitRowSafe(line) {
  line = line.trim().replace(/^\||\|$/g, '');

  const cells = [];
  let cur = '';
  let inCode = false;
  let inMath = false;
  let escape = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (escape) {
      cur += ch;
      escape = false;
      continue;
    }

    if (ch === '\\') {
      escape = true;
      continue;
    }

    if (ch === '`') {
      inCode = !inCode;
      cur += ch;
      continue;
    }

    if (ch === '$' && !inCode) {
      inMath = !inMath;
      cur += ch;
      continue;
    }

    if (ch === '|' && !inCode && !inMath) {
      cells.push(cur.trim());
      cur = '';
      continue;
    }

    cur += ch;
  }

  if (cur.length) cells.push(cur.trim());
  return cells;
}

function parseTable(lines, i) {
  const headerLine = lines[i];
  const alignLine = lines[i + 1];

  // 表头行必须以 | 开始
  if (!/^\s*\|.*\|\s*$/.test(headerLine)) {
    return [null, i + 1];
  }

  // 对齐行必须至少有一个 ---（且也是以 | 包围）
  if (!alignLine || !/^\s*\|.*-.*\|\s*$/.test(alignLine)) {
    return [null, i + 1];
  }

  const headers = splitRowSafe(headerLine);
  const aligns = splitRowSafe(alignLine).map((s) => {
    if (/^:-+:$/.test(s)) return 'center';
    if (/^:-+$/.test(s)) return 'left';
    if (/^-+:$/.test(s)) return 'right';
    return 'left';
  });

  const rows = [];
  let j = i + 2;
  while (j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j])) {
    rows.push(splitRowSafe(lines[j]));
    j++;
  }

  // 构建 AST 节点
  const node = {
    type: 'table',
    header: headers.map((h, idx) => ({
      type: 'table-cell',
      align: aligns[idx] || 'left',
      content: parseInline(h),
    })),
    rows: rows.map((r) =>
      r.map((cell, idx) => ({
        type: 'table-cell',
        align: aligns[idx] || 'left',
        content: parseInline(cell),
      }))
    ),
  };

  return [node, j];
}

/** 主解析：逐行扫描、组装 section 树 */
export function parseMarkdownToAST(mdContent) {
  const lines = LF(mdContent).split('\n');

  const ast = [];
  let i = 0;
  let currentSection = null;

  const push = (node) => {
    if (!node) return;
    if (currentSection) currentSection.content.push(node);
    else ast.push(node);
  };

  while (i < lines.length) {
    let line = lines[i];

    // 跳过空行
    if (!line.trim()) { i++; continue; }

    // 标题：#Title[#YYYY-MM-DD]
    // 允许 # 后无空格；可跟日期
    const h = line.match(/^\s*#\s*([^#\n]+?)(?:#(\d{4}-\d{2}-\d{2}))?\s*$/);
    if (h) {
      const titleText = h[1].trim();
      const date = h[2];
      currentSection = {
        type: 'section',
        title: parseInline(titleText),
        content: []
      };
      if (date) currentSection.date = date;
      ast.push(currentSection);
      i++;
      continue;
    }

    // Math(display)：以 \[ 开始、以 \] 结束（可换行）
    if (/^\s*\\\[.*$/.test(line)) {
      const [node, ni] = parseDisplayMath(lines, i);
      push(node);
      i = ni;
      continue;
    }

    // ===== 表格：至少两行，第一行 |...|，第二行 ---
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|.*-.*\|\s*$/.test(lines[i + 1])) {
      const [node, ni] = parseTable(lines, i);
      if (node) {
        push(node);
        i = ni;
        continue;
      }
    }

    // ===== 围栏代码块：```lang[=lineno]
    if (/^\s*```/.test(line)) {
      const [node, ni] = parseFence(lines, i);
      push(node);
      i = ni;
      continue;
    }

    // ===== 列表：+ 开头，Tab/空格缩进控制层级
    if (/^[ \t]*\+\s+/.test(line)) {
      const base = tabs(line);
      const [node, ni] = parseList(lines, i, base, false);
      push(node);
      i = ni;
      continue;
    }

    // ===== 普通段落：累计到结构块或空行
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*\\\[.*$/.test(lines[i]) &&
      !/^\s*```/.test(lines[i]) &&
      !/^[ \t]*\+\s+/.test(lines[i]) &&
      !/^\s*#/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    if (para.length) {
      push({ type: 'paragraph', content: parseInline(para.map(trimIndent).join('\n')) });
      continue;
    }

    // default
    console.warn('[parseMarkdownToAST] 未知行类型，跳过：', line);
    i++;
  }

  return ast;
}
