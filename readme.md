# md-renderer-react

A React-based Markdown renderer.

## Quick Start

### Installation

Clone this repo and install packages via:

```bash
npm install
```

### Example

```javascript
import mdRenderer from 'md-renderer-react';

// 1. 获取外部容器和MD内容
const renderContainer = document.getElementById('md-container');
const mdContent = `# 测试MD
- 列表项1
- 列表项2
\`\`\`javascript
console.log('代码块');
\`\`\`
`;

// 2. 调用渲染（带回调）
mdRenderer.render(renderContainer, mdContent, {
  onLoading: (container) => {
    // 加载中状态：显示loading
    container.innerHTML = '<div style="padding: 16px; color: #666;">MD加载中...</div>';
  },
  onSuccess: ({ container, ast }) => {
    console.log('渲染成功！AST:', ast);
  },
  onError: (err) => {
    console.error('渲染失败:', err);
  }
});

// 3. 页面卸载时销毁
window.addEventListener('beforeunload', () => {
  mdRenderer.destroy(renderContainer);
});
```

## Struction

```bash
md-renderer-react/
├── index.js
├── package.json
└── src/
    ├── index.js
    ├── MDRenderer.js
    ├── renderer/
    │   ├── md-renderer.js # function: ast to react dom
    |   └── ast-react.js   # details of renderer
    ├── parser/ 
    |   └── analyser.js    # function: md to ast
    └── utils/
        └── helper.js
```

## API Reference

### 1. Default Instance: `mdRenderer`

The pre-initialized singleton instance (use this for most cases—no `new` required).

#### Methods

| Method    | Parameters                                                   | Return Value    | Description                                                  |
| --------- | ------------------------------------------------------------ | --------------- | ------------------------------------------------------------ |
| `render`  | `(container: HTMLElement, mdContent: string, callbacks?: Callbacks)` | `Promise<void>` | Renders Markdown content into the specified DOM container.   |
| `destroy` | `(container?: HTMLElement)`                                  | `void`          | Unmounts React instances to free memory. Omit `container` to clean all. |

#### `Callbacks` Type

```typescript
interface Callbacks {
  onLoading?: (container: HTMLElement) => void; // Triggered when rendering starts
  onSuccess?: (data: { container: HTMLElement; ast: any[] }) => void; // Triggered on success
  onError?: (err: Error) => void; // Triggered on parsing/rendering failure
}
```

### 2. Renderer Class: `MDRenderer`

Use this if you need multiple custom instances (e.g., different error handlers for different parts of an app).

#### Constructor Options

```typescript
interface MDRendererOptions {
  mode?: 'react'; // Only "react" supported currently (reserved for future extensions)
  onLoading?: (container: HTMLElement) => void; // Global loading callback
  onSuccess?: (data: { container: HTMLElement; ast: any[] }) => void; // Global success callback
  onError?: (err: Error) => void; // Global error callback (overridden by local `render` callbacks)
}
```

#### Example

```javascript
import { MDRenderer } from 'md-renderer-react';

// Create a custom instance with a unique error handler
const customRenderer = new MDRenderer({
  onError: (err) => {
    console.error('Custom error handler:', err);
    alert(`Markdown render failed: ${err.message}`);
  }
});

// Use the custom instance
customRenderer.render(container, mdContent);
```

### 3. Helper Exports

Use these for advanced scenarios (e.g., embedding the renderer in a React component).

| Export              | Type            | Description                                                  |
| ------------------- | --------------- | ------------------------------------------------------------ |
| `ASTRenderer_React` | React Component | Top-level component that renders an AST (use in React projects). |
| `ASTnode2DOM_React` | Function        | Converts a single AST node to React DOM (for custom node rendering). |
| `helperUtils`       | Object          | Utility functions (e.g., `ensureLines` to append newlines to Markdown). |
| `parser`            | Object          | Raw Markdown parser (use `parser.parse(mdContent)` to get an AST directly). |

#### Example: Use in a React Component

```javascript
import React, { useEffect, useState } from 'react';
import { ASTRenderer_React, parser } from 'md-renderer-react';

export function MDComponent({ mdContent }) {
  const [ast, setAst] = useState([]);

  // Parse Markdown to AST on content change
  useEffect(() => {
    async function parseContent() {
      try {
        const rawAst = await parser.parse(mdContent);
        setAst(JSON.parse(rawAst));
      } catch (err) {
        console.error('Parse failed:', err);
      }
    }
    parseContent();
  }, [mdContent]);

  return <ASTRenderer_React ast={ast} />;
}
```

## Supported Markdown Syntax

| Syntax Type     | Example                              | Rendered Output               |
| --------------- | ------------------------------------ | ----------------------------- |
| Headings        | `# H1`, `## H2`                      | Semantic `<section>` + `<h2>` |
| Text Styles     | `**bold**`, `_italic_`, `underlined` | `<b>`, `<i>`, `<u>` tags      |
| Unordered Lists | `- Item 1`, `- Subitem` (nested)     | `<ul>` + `<li>`               |
| Ordered Lists   | `1. Item 1`, `2. Item 2`             | `<ol>` + `<li>`               |
| Code Blocks     | `javascript console.log()`           | Highlighted `<pre>` block     |
| Math (Inline)   | `$E=mc^2$`                           | Inline KaTeX formula          |
| Math (Display)  | `$$\int_0^\infty e^{-x}dx$$`         | Block KaTeX formula           |
| Images          | `![Alt Text](path/to/img.jpg)`       | `<img>` with caption          |
| Links           | `[Text](https://internal.link)`      | `<a>` (opens in new tab)      |
| Paragraphs      | Plain text lines                     |                               |

