import React from 'react';
import hljs from 'highlight.js';
import katex from 'katex';

const CodeLine = ({ line, styles }) => (
  <p className={styles.code ?? 'code'} dangerouslySetInnerHTML={{ __html: line }} />
);

const Emphasis = ({ type, content, styles }) => {
  const Tag = type === 'italic' ? 'i' : 
              type === 'bold' ? 'b' : 
              type === 'underlined' ? 'u' : 'span';
  
  return (
    <span className={`${styles?.[type] ?? type} ${styles?.md ?? 'md'}`}>
      <Tag>{content}</Tag>
    </span>
  );
};

const MathComponent = ({ mode, expression, styles }) => {
  let renderedMath;
  try {
    renderedMath = katex.renderToString(expression, {
      displayMode: mode === 'display',
      throwOnError: false
    });
  } catch (e) {
    console.error('KaTeX渲染错误:', e);
    renderedMath = expression;
  }
  
  return (
    <span 
      className={`${styles?.math ?? 'math'} ${mode} ${styles?.md ?? 'md'}`} 
      dangerouslySetInnerHTML={{ __html: renderedMath }} 
    />
  );
};

const CodeBlock = ({ code, language, lineno, styles }) => {
  const highlighter = language 
    ? () => hljs.highlight(code, { language, ignoreIllegals: true }).value
    : () => hljs.highlightAuto(code).value;
  
  const highlightedHtml = highlighter();
  const highlightedCode = highlightedHtml.trimEnd().split(/\n/g);

  return (
    <pre 
      className={styles.code ?? 'code'} 
      styles={{ counterReset: `line-number ${lineno ?? 0}` }}
    >
      <p className={styles.language ?? 'language'}>{language || 'auto'}</p>
      {highlightedCode.map((line, index) => (
        <CodeLine key={index} line={line} styles={styles} />
      ))}
    </pre>
  );
};

const Table = ({ header, rows, styles }) => (
  <table className={`${styles.table ?? 'table'} ${styles.md ?? 'md'}`}>
    <thead>
      <tr>
        {header.map((cell, idx) => (
          <TableCell key={idx} {...cell} isHeader={true} styles={styles} />
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, rIdx) => (
        <tr key={rIdx}>
          {row.map((cell, cIdx) => (
            <TableCell key={cIdx} {...cell} styles={styles} />
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

const TableCell = ({ align, content, isHeader, styles }) => {
  const Tag = isHeader ? 'th' : 'td';
  return (
    <Tag className={`${styles['table-cell'] ?? 'table-cell'} align-${align}`}>
      {Array.isArray(content)
        ? content.map((item, index) => (
            <React.Fragment key={index}>
              {ASTnode2DOM_React(item, styles)}
            </React.Fragment>
          ))
        : ASTnode2DOM_React(content, styles)}
    </Tag>
  );
};

const PlainText = ({ text, styles }) => (
  <span className={styles.plain ?? 'plain'}>{text}</span>
);

const Paragraph = ({ content, styles }) => (
  <div className={styles.paragraph ?? 'md'}>{content}</div>
);

const Figure = ({ caption, path, styles }) => (
  <figure className={styles.md ?? 'md'}>
    <img className={styles.md ?? 'md'} src={path} alt={caption} />
    <figcaption className={styles.caption ?? 'caption md'}>{caption}</figcaption>
  </figure>
);

const Link = ({ text, src, styles }) => (
  <a
    className={styles.md ?? 'md'}
    href={src}
    target="_blank"
    rel="noopener noreferrer"
  >
    {text}
  </a>
);

const List = ({ type, content, styles }) => {
  const Tag = type === 'itemization' ? 'ul' : 'ol';
  return <Tag className={styles[type] ?? type}>{content}</Tag>;
};

const NormalItem = ({ title, content, styles }) => (
  <li>
    <p className={styles.item ?? 'item'}>{title}</p>
    <div className={styles.item ?? 'item'}>{content}</div>
  </li>
);

const PlainItem = ({ content, styles }) => (
  <li className={styles.plain ?? 'plain'}>
    <div className={styles.item ?? 'item'}>{content}</div>
  </li>
);

const Section = ({ title, content, time, styles }) => (
  <section className={styles.section ?? 'section'}>
    <div className={styles.title ?? 'title'}>
      <h2>{title}</h2>
      {time && <span className={styles['section-time'] ?? 'section-time'}>{time}</span>}
    </div>
    <div className={styles['section-content'] ?? 'section-content'}>
      {content}
    </div>
  </section>
);

export function ASTnode2DOM_React(ASTnode, styles = {}) {
  if (!ASTnode) return null;
  console.log("[ASTnode2DOM_React] styles:", styles);

  const renderContent = (content) => {
    if (Array.isArray(content)) {
      return content.map((item, index) => (
        <React.Fragment key={index}>
          {ASTnode2DOM_React(item, styles)}
        </React.Fragment>
      ));
    } else if (typeof content === 'string') {
      return <PlainText text={content} style={styles} />;
    } else if (typeof content == 'object' && content !== null) {
      return <React.Fragment>{ASTnode2DOM_React(content, styles)}</React.Fragment>;
    }
    return null;
  };

  switch (ASTnode.type) {
    case "section":
      console.log("[ASTnode2DOM_React] styles.section:", styles.section);
      return (
        <Section 
          title={renderContent(ASTnode.title)} 
          content={renderContent(ASTnode.content)}
          time={ASTnode.date} 
          styles={styles}
        />
      );
      
    case "itemization":
    case "enumeration":
      return (
        <List 
          type={ASTnode.type}
          content={renderContent(ASTnode.items || [])}
          styles={styles}
        />
      );
      
    case "normal-item":
      return (
        <NormalItem 
          title={ASTnode2DOM_React(ASTnode.title, styles)} 
          content={renderContent(ASTnode.content)}
          styles={styles}
        />
      );
      
    case "math":
      return (
        <MathComponent 
          mode={ASTnode.mode} 
          expression={ASTnode.content}
          styles={styles}
        />
      );
      
    case "figure":
      return (
        <Figure 
          caption={ASTnode.caption.content} 
          path={ASTnode.path} 
          styles={styles}
        />
      );
      
    case "link":
      return (
        <Link 
          text={ASTnode2DOM_React(ASTnode.text, styles)} 
          src={ASTnode.link}
          styles={styles}
        />
      );
      
    case "paragraph":
      return (
        <Paragraph 
          content={renderContent(ASTnode.content)}
          styles={styles}
        />
      );
      
    case "italic":
    case "bold":
    case "underlined":
      return (
        <Emphasis 
          type={ASTnode.type} 
          content={renderContent(ASTnode.content)}
          styles={styles}
        />
      );
      
    case "code-block":
      return (
        <CodeBlock 
          code={ASTnode.content}
          language={ASTnode.language} 
          lineno={ASTnode["line-number"]}
          styles={styles}
        />
      );

    case "table":
      return (
        <Table 
          header={ASTnode.header || []} 
          rows={ASTnode.rows || []}
          styles={styles}
        />
      );
      
    case "plain":
      return <PlainText text={ASTnode.content} styles={styles} />;

    case "plain-item":
      return (
        <PlainItem 
          content={renderContent(ASTnode.content)} 
          styles={styles}
        />
      );
      
    default:
      console.warn(`未知的AST节点类型: ${ASTnode.type}`);
      return null;
  }
}
