import React, { useState, useEffect } from 'react';
import hljs from 'highlight.js';
import katex from 'katex';

const CodeLine = ({ line }) => {
  return (
    <p className="code" dangerouslySetInnerHTML={{ __html: line }} />
  );
};

const Emphasis = ({ type, content }) => {
  const Tag = type === 'italic' ? 'i' : 
              type === 'bold' ? 'b' : 
              type === 'underlined' ? 'u' : 'span';
  
  return (
    <span className={`${type} md`}>
      <Tag>{content}</Tag>
    </span>
  );
};

const MathComponent = ({ mode, expression }) => {
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
      className={`math ${mode} md`} 
      dangerouslySetInnerHTML={{ __html: renderedMath }} 
    />
  );
};

const CodeBlock = ({ code, language, lineno }) => {
  const highlighter = language 
    ? () => hljs.highlight(code, { language, ignoreIllegals: true }).value
    : () => hljs.highlightAuto(code).value;
  
  const highlightedHtml = highlighter();
  const highlightedCode = highlightedHtml.trimEnd().split(/\n/g);

  return (
    <pre 
      className="code" 
      style={{ counterReset: `line-number ${lineno ?? 0}` }}
    >
      {/* 显示代码语言（自动识别时显示 'auto'） */}
      <p className="language">{language || 'auto'}</p>
      
      {/* 遍历单行高亮代码，渲染每一行（通过 CodeLine 组件） */}
      {highlightedCode.map((line, index) => (
        <CodeLine key={index} line={line} />
      ))}
    </pre>
  );
};

const Table = ({ header, rows }) => (
  <table className="md table">
    <thead>
      <tr>
        {header.map((cell, idx) => (
          <TableCell key={idx} {...cell} isHeader={true} />
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, rIdx) => (
        <tr key={rIdx}>
          {row.map((cell, cIdx) => (
            <TableCell key={cIdx} {...cell} />
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

const TableCell = ({ align, content, isHeader }) => {
  const Tag = isHeader ? 'th' : 'td';
  return (
    <Tag className={`md table-cell align-${align}`}>
      {Array.isArray(content)
        ? content.map((item, index) => (
            <React.Fragment key={index}>
              {ASTnode2DOM_React(item)}
            </React.Fragment>
          ))
        : ASTnode2DOM_React(content)}
    </Tag>
  );
};

const PlainText = ({ text }) => <span className="plain md">{text}</span>;

const Paragraph = ({ content }) => (
  <p className="md">{content}</p>
);

const Figure = ({ caption, path }) => (
  <p className="md">
    <img className="md" src={path} alt={caption} />
    <p className="caption md">{caption}</p>
  </p>
);

const Link = ({ text, src }) => (
  <a className="md" href={src} target="_blank" rel="noopener noreferrer">
    {text}
  </a>
);

const List = ({ type, content }) => {
  // 无序列表用<ul>，有序列表用<ol>
  const Tag = type === 'itemization' ? 'ul' : 'ol';
  return <Tag className={type}>{content}</Tag>;
};

const NormalItem = ({ title, content }) => (
  <li>
    <p className="item md">{title}</p>
    <div className="item">{content}</div>
  </li>
);

const PlainItem = ({ content }) => (
  <li className="plain">
    <div className="item">{content}</div>
  </li>
);

const Section = ({ title, content, time }) => (
  <section className="section">
    <div className="title">
      <h2>{title}</h2>
      {time && <span className="section-time">{time}</span>}
    </div>
    <div className="section-content">
      {content}
    </div>
  </section>
);

export function ASTnode2DOM_React(ASTnode) {
  // console.log("[ASTnode2DOM_React] ASTnode", ASTnode);
  if (!ASTnode) return null;

  // 辅助函数：处理 content
  const renderContent = (content) => {
    if (Array.isArray(content)) {
      // 数组类型：递归转换每个子节点
      return content.map((item, index) => (
        <React.Fragment key={index}>
          {ASTnode2DOM_React(item)}
        </React.Fragment>
      ));
    } else if (typeof content === 'string') {
      // 字符串类型：直接作为文本渲染
      return <PlainText text={content} />;
    } else if (typeof content == 'object' && content !== null) {
      // 对象类型（单个 AST 节点）
      return <React.Fragment>{ASTnode2DOM_React(content)}</React.Fragment>;
    }
    // 其他非法类型
    return null;
  };

  switch (ASTnode.type) {
    case "section":
      return (
        <Section 
          title={renderContent(ASTnode.title)} 
          content={renderContent(ASTnode.content)}
          time={ASTnode.date} 
        />
      );
      
    case "itemization":
    case "enumeration":
      return (
        <List 
          type={ASTnode.type}
          content={renderContent(ASTnode.items || [])}
        />
      );
      
    case "normal-item":
      return (
        <NormalItem 
          title={ASTnode2DOM_React(ASTnode.title)} 
          content={renderContent(ASTnode.content)}
        />
      );
      
    case "math":
      return (
        <MathComponent 
          mode={ASTnode.mode} 
          expression={ASTnode.content}  // 数学公式 content 是字符串，直接传
        />
      );
      
    case "figure":
      return (
        <Figure 
          caption={ASTnode.caption.content} 
          path={ASTnode.path} 
        />
      );
      
    case "link":
      return (
        <Link 
          text={ASTnode2DOM_React(ASTnode.text)} 
          src={ASTnode.link} 
        />
      );
      
    case "paragraph":
      return (
        <Paragraph 
          content={renderContent(ASTnode.content)}
        />
      );
      
    case "italic":
    case "bold":
    case "underlined":
      return (
        <Emphasis 
          type={ASTnode.type} 
          content={renderContent(ASTnode.content)}
        />
      );
      
    case "code-block":
      return (
        <CodeBlock 
          code={ASTnode.content}  // 代码块 content 是字符串，直接传
          language={ASTnode.language} 
          lineno={ASTnode["line-number"]} 
        />
      );

    case "table":
      return (
        <Table 
          header={ASTnode.header || []} 
          rows={ASTnode.rows || []} 
        />
      );
      
    case "plain":
      return <PlainText text={ASTnode.content} />;

    case "plain-item":
      return (
        <PlainItem 
          content={renderContent(ASTnode.content)} 
        />
      );
      
    default:
      console.warn(`未知的AST节点类型: ${ASTnode.type}`);
      return null;
  }
}