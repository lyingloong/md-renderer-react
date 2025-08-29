import React, { useState, useEffect } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// 代码高亮组件
const CodeLine = ({ line }) => {
  return (
    <p className="code" dangerouslySetInnerHTML={{ __html: line }} />
  );
};

// 强调样式组件 (斜体、粗体等)
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

// 数学公式组件
const MathComponent = ({ mode, expression }) => {
  const [renderedMath, setRenderedMath] = useState('');
  
  useEffect(() => {
    try {
      const html = katex.renderToString(expression, {
        displayMode: mode === 'display',
        throwOnError: false
      });
      setRenderedMath(html);
    } catch (e) {
      console.error('KaTeX渲染错误:', e);
      setRenderedMath(expression);
    }
  }, [expression, mode]);
  
  return (
    <span 
      className={`math ${mode} md`} 
      dangerouslySetInnerHTML={{ __html: renderedMath }} 
    />
  );
};

// 代码块组件
const CodeBlock = ({ code, language, lineno }) => {
  const [highlightedCode, setHighlightedCode] = useState([]);
  
  useEffect(() => {
    const highlighter = language 
      ? () => hljs.highlight(code, { language, ignoreIllegals: true }).value
      : () => hljs.highlightAuto(code).value;
    
    const html = highlighter();
    const lines = html.trimEnd().split(/\n/g);
    setHighlightedCode(lines);
  }, [code, language]);
  
  return (
    <pre 
      className="code" 
      style={{ counterReset: `line-number ${lineno ?? 0}` }}
    >
      <p className="language">{language || 'auto'}</p>
      {highlightedCode.map((line, index) => (
        <CodeLine key={index} line={line} />
      ))}
    </pre>
  );
};

// 基础文本组件
const PlainText = ({ text }) => <span className="plain md">{text}</span>;

// 段落组件
const Paragraph = ({ content }) => (
  <p className="md">{content}</p>
);

// 图片组件
const Figure = ({ caption, path }) => (
  <p className="md">
    <img className="md" src={path} alt={caption} />
    <p className="caption md">{caption}</p>
  </p>
);

// 链接组件
const Link = ({ text, src }) => (
  <a className="md" href={src} target="_blank" rel="noopener noreferrer">
    {text}
  </a>
);

// 列表组件（区分无序列表和有序列表）
const List = ({ type, content }) => {
  // 无序列表用<ul>，有序列表用<ol>
  const Tag = type === 'itemization' ? 'ul' : 'ol';
  return <Tag className={type}>{content}</Tag>;
};

// 普通列表项
const NormalItem = ({ title, content }) => (
  <li>
    <p className="item md">{title}</p>
    <div className="item">{content}</div>
  </li>
);

// 普通文本项
const PlainItem = ({ content }) => (
  <li className="plain">
    <div className="item">{content}</div>
  </li>
);

// 章节组件
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

// 主转换函数
export function ASTnode2DOM_React(ASTnode) {
  if (!ASTnode) return null;
  console.log(ASTnode);

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
          title={ASTnode2DOM_React(ASTnode.title)} 
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
          caption={ASTnode2DOM_React(ASTnode.caption)} 
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