const LF = (s) => s.replace(/\r\n?/g, '\n');

/** --------- 行内解析：返回 [inline nodes...] --------- */
function parseInline(text) {
  const out = [];
  const pushPlain = (s) => { if (s) out.push({ type: 'plain', content: s }); };

  // 统一处理转义：只处理 \[, \], \$，其余保留
  // 注：不要全局清理反斜杠，避免破坏 LaTeX
  const tokenRe = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|(?<!\\)\$([^$]+)\$|\^([^*]+)\^|\*([^*]+)\*|__([^_]+)__|_([^_]+)_|\^([^^]+)\^|```([\s\S]+?)```|`([^`]+)`/g;


  let last = 0, m;
  while ((m = tokenRe.exec(text)) !== null) {
    if (m.index > last) pushPlain(text.slice(last, m.index));

    if (m[1] !== undefined) {
      // image
      out.push({
        type: 'figure',
        path: m[2],
        caption: { type: 'plain', content: m[1] || '' }
      });
    } else if (m[3] !== undefined) {
      // link（text 需为单节点，兼容你的 Link 组件）
      out.push({
        type: 'link',
        text: { type: 'plain', content: m[3] },
        link: m[4]
      });
    } else if (m[5] !== undefined) {
      // inline math
      out.push({ type: 'math', mode: 'inline', content: m[5] });
    } else if (m[6] !== undefined) {
      out.push({ type: 'bold', content: parseInline(m[6]) });
    } else if (m[7] !== undefined || m[8] !== undefined) {
      const inner = m[7] ?? m[8];
      out.push({ type: 'italic', content: parseInline(inner) });
    } else if (m[9] !== undefined) {
      out.push({ type: 'underlined', content: parseInline(m[9]) });
    }

    last = tokenRe.lastIndex;
  }
  if (last < text.length) pushPlain(text.slice(last));
  return out;
}

/** --------- 块级解析工具 --------- */
const leading = (s) => (s.match(/^[ \t]*/)?.[0] ?? '');
const tabs = (s) => {
  // Tab 优先；两个/四个空格也当成 1 级
  const m = leading(s);
  if (!m) return 0;
  // 把前缀里的空格按 2/4 折算为 1 级
  let lvl = 0, i = 0;
  while (i < m.length) {
    if (m[i] === '\t') { lvl++; i++; continue; }
    // 吃尽连续空格（2 或 4 都当 1 级）
    let j = i;
    while (j < m.length && m[j] === ' ') j++;
    const span = j - i;
    if (span >= 2) { lvl++; i += span; }
    else break;
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

    // 吸收属于此项的后续行（比当前项更深的缩进，或者空行）
    while (j < lines.length) {
      const l2 = lines[j];
      if (!l2.trim()) { contentLines.push(''); j++; continue; }
      const lvl2 = tabs(l2);
      // 同级下一个 + 列表项，停止
      if (/^[ \t]*\+\s+/.test(l2) && lvl2 === baseLevel) break;
      if (lvl2 <= baseLevel) break;
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

    // 只有一段内容且无子块 → plain-item
    if (blocks.length === 1 && blocks[0].type === 'paragraph') {
      items.push({
        type: 'plain-item',
        content: blocks[0].content
      });
    } else {
      items.push({
        type: 'normal-item',
        title: { type: 'plain', content: titleText },
        content: blocks
      });
    }

    i = j;
  }

  return [{ type: listType, items }, i];
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