import React from 'react';
import hljs from 'highlight.js';
import katex from 'katex';

/**
 * ASTnode2DOM_React：把单个 AST 节点（或子树）转成 React 元素
 * @param {Object|Array|string} ASTnode
 * @param {Object} styles - CSS Module 映射对象（可以为空）
 */
export function ASTnode2DOM_React(ASTnode, styles = {}) {
  if (!ASTnode && ASTnode !== 0) return null; // 防空

  // 将传入的类名映射为 module 样式，支持传多个参数或空格复合名
  const cn = (...names) =>
    names
      .flat()
      .filter(Boolean)
      .flatMap((n) => String(n).split(/\s+/))
      .map((token) => styles[token] || token)
      .join(' ');

  // 递归渲染 content（可能是字符串、数组或单个节点）
  const renderContent = (content) => {
    if (Array.isArray(content)) {
      return content.map((item, idx) => (
        <React.Fragment key={idx}>{ASTnode2DOM_React(item, styles)}</React.Fragment>
      ));
    } else if (typeof content === 'string' || typeof content === 'number') {
      return <span className={cn('plain', 'md')}>{content}</span>;
    } else if (typeof content === 'object' && content !== null) {
      return <React.Fragment>{ASTnode2DOM_React(content, styles)}</React.Fragment>;
    }
    return null;
  };

  // ---------------- 子组件实现（内联，使用 styles） ----------------

  const Emphasis = ({ type, content }) => {
    const Tag = type === 'italic' ? 'i' : type === 'bold' ? 'b' : type === 'underlined' ? 'u' : 'span';
    return <span className={cn(type, 'md')}><Tag>{renderContent(content)}</Tag></span>;
  };

  const MathComponent = ({ mode, expression }) => {
    let renderedMath;
    try {
      renderedMath = katex.renderToString(expression, { displayMode: mode === 'display', throwOnError: false });
    } catch (e) {
      console.error('KaTeX渲染错误:', e);
      renderedMath = expression;
    }
    return <span className={cn('math', mode, 'md')} dangerouslySetInnerHTML={{ __html: renderedMath }} />;
  };

  const CodeBlock = ({ code, language, lineno }) => {
    const highlighter = language
      ? () => hljs.highlight(code, { language, ignoreIllegals: true }).value
      : () => hljs.highlightAuto(code).value;

    const highlightedHtml = highlighter();
    const highlightedCode = String(highlightedHtml).trimEnd().split('\n');

    return (
      <pre className={cn('codeBlock')} style={{ counterReset: `line-number ${lineno ?? 0}` }}>
        <p className={cn('codeLanguage')}>{language || 'auto'}</p>
        {highlightedCode.map((line, i) => (
          <p key={i} className={cn('codeLine')} dangerouslySetInnerHTML={{ __html: line }} />
        ))}
      </pre>
    );
  };

  const TableCell = ({ align, content, isHeader }) => {
    const Tag = isHeader ? 'th' : 'td';
    return (
      <Tag className={cn('tableCell', `align-${align || 'left'}`)}>
        {Array.isArray(content) ? content.map((item, idx) => <React.Fragment key={idx}>{ASTnode2DOM_React(item, styles)}</React.Fragment>) : ASTnode2DOM_React(content, styles)}
      </Tag>
    );
  };

  const Table = ({ header = [], rows = [] }) => (
    <table className={cn('table')}>
      <thead>
        <tr>{header.map((cell, idx) => <TableCell key={idx} {...cell} isHeader={true} />)}</tr>
      </thead>
      <tbody>
        {rows.map((row, rIdx) => (
          <tr key={rIdx}>
            {row.map((cell, cIdx) => <TableCell key={cIdx} {...cell} />)}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const PlainText = ({ text }) => <span className={cn('plain', 'md')}>{text}</span>;

  const Paragraph = ({ content }) => <p className={cn('paragraph')}>{renderContent(content)}</p>;

  const Figure = ({ caption, path }) => (
    <figure className={cn('figure')}>
      <img className={cn('figureImg')} src={path} alt={caption || ''} />
      {caption ? <figcaption className={cn('figureCaption')}>{renderContent(caption)}</figcaption> : null}
    </figure>
  );

  const Link = ({ text, src }) => (
    <a className={cn('link', 'md')} href={src} target="_blank" rel="noopener noreferrer">
      {renderContent(text)}
    </a>
  );

  const List = ({ type, content }) => {
    const Tag = type === 'itemization' ? 'ul' : 'ol';
    return <Tag className={cn(type)}>{Array.isArray(content) ? content.map((c, i) => <React.Fragment key={i}>{ASTnode2DOM_React(c, styles)}</React.Fragment>) : renderContent(content)}</Tag>;
  };

  const NormalItem = ({ title, content }) => (
    <li className={cn('normalItem')}>
      <p className={cn('item', 'md')}>{ASTnode2DOM_React(title, styles)}</p>
      <div className={cn('itemContent')}>{renderContent(content)}</div>
    </li>
  );

  const PlainItem = ({ content }) => (
    <li className={cn('plainItem')}>
      <div className={cn('item')}>{renderContent(content)}</div>
    </li>
  );

  const Section = ({ title, content, time }) => (
    <section className={cn('section')}>
      <div className={cn('sectionTitle')}>
        <h2>{renderContent(title)}</h2>
        {time && <span className={cn('sectionTime')}>{time}</span>}
      </div>
      <div className={cn('sectionContent')}>{renderContent(content)}</div>
    </section>
  );

  // ---------------- switch on node type ----------------
  // ASTnode 可能是数组（root children），字符串，或单个节点对象
  if (Array.isArray(ASTnode)) {
    return (
      <React.Fragment>
        {ASTnode.map((node, idx) => <React.Fragment key={idx}>{ASTnode2DOM_React(node, styles)}</React.Fragment>)}
      </React.Fragment>
    );
  }

  if (typeof ASTnode === 'string' || typeof ASTnode === 'number') {
    return <PlainText text={String(ASTnode)} />;
  }

  // 现在 ASTnode 是对象
  switch (ASTnode.type) {
    case 'section':
      return <Section title={ASTnode.title} content={ASTnode.content} time={ASTnode.date} />;

    case 'itemization':
    case 'enumeration':
      return <List type={ASTnode.type} content={ASTnode.items || []} />;

    case 'normal-item':
      return <NormalItem title={ASTnode.title} content={ASTnode.content} />;

    case 'math':
      return <MathComponent mode={ASTnode.mode} expression={ASTnode.content} />;

    case 'figure':
      return <Figure caption={ASTnode.caption ? ASTnode.caption.content : ''} path={ASTnode.path} />;

    case 'link':
      return <Link text={ASTnode.text} src={ASTnode.link} />;

    case 'paragraph':
      return <Paragraph content={ASTnode.content} />;

    case 'italic':
    case 'bold':
    case 'underlined':
      return <Emphasis type={ASTnode.type} content={ASTnode.content} />;

    case 'code-block':
      return <CodeBlock code={ASTnode.content} language={ASTnode.language} lineno={ASTnode['line-number']} />;

    case 'table':
      return <Table header={ASTnode.header || []} rows={ASTnode.rows || []} />;

    case 'plain':
      return <PlainText text={ASTnode.content} />;

    case 'plain-item':
      return <PlainItem content={ASTnode.content} />;

    default:
      console.warn(`未知的AST节点类型: ${ASTnode.type}`);
      return null;
  }
}
