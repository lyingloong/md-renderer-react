# md-renderer-react

A React-based Markdown renderer with dual capabilities: render Markdown to live DOM elements (for browser display) and generate static React component code strings (for offline use/export). It leverages WebAssembly for fast Markdown-to-AST parsing and supports common Markdown syntax (including code highlighting and math formulas).

## Quick Start

### Installation

Clone this repo and install packages via:

```bash
npm install
```

### Example

Render Markdown content directly into a browser DOM container with loading/error states:

```javascript
import { mdRenderer } from 'md-renderer-react';

// Step 1: Prepare container and Markdown content
const renderContainer = document.getElementById('md-container'); // DOM element to hold output
const mdContent = `# Markdown Demo
- **Unordered List Item** (bold text)
- _Italic List Item_
- Inline math: $E=mc^2$

\`\`\`javascript
// Code block with syntax highlighting
console.log('Hello from md-renderer-react!');
\`\`\`

Display math:
$$\int_0^\infty e^{-x}dx = 1$$
`;

// Step 2: Call render with callbacks
mdRenderer.render(renderContainer, mdContent, {
  onLoading: (container) => {
    // Show loading state
    container.innerHTML = '<div style="padding: 16px; color: #666;">Rendering Markdown...</div>';
  },
  onSuccess: ({ container, ast }) => {
    console.log('Render success! AST structure:', ast);
  },
  onError: (err) => {
    console.error('Render failed:', err);
    renderContainer.innerHTML = `<div style="color: red; padding: 16px;">Error: ${err.message}</div>`;
  }
});

// Step 3: Clean up on page unload (prevent memory leaks)
window.addEventListener('beforeunload', () => {
  mdRenderer.destroy(renderContainer); // Unmount React instance
});
```

Generate a string of React component code from Markdown (for export/saving—no browser DOM required):

```javascript
import { mdRenderer } from 'md-renderer-react';

const mdContent = `# Generated React Component
This Markdown will become a reusable React component.
- No DOM container needed
- Includes syntax highlighting
`;

// Generate React component code (returns a promise)
mdRenderer.getReactComponentCode(mdContent, {
  componentName: 'MyGeneratedMD' // Custom component name (default: "MDComponent")
}).then(result => {
  if (result.success) {
    console.log('Generated React Component Code:\n', result.data);
    // Example output (result.data):
    // import React from 'react';
    // import './index.css';
    // export default function MyGeneratedMD() {
    //   return (
    //     <div className="react-rendered-content">
    //       <h1>Generated React Component</h1>
    //       <p>This Markdown will become a reusable React component.</p>
    //       <ul><li>No DOM container needed</li><li>Includes syntax highlighting</li></ul>
    //     </div>
    //   );
    // }
  } else {
    console.error('Code generation failed:', result.data);
  }
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
| Tables          | `| a | b |\n| ---- | ---: |`         | <table> with <thead> <tbody>  |
| Math (Inline)   | `$E=mc^2$`                           | Inline KaTeX formula          |
| Math (Display)  | `$$\int_0^\infty e^{-x}dx$$`         | Block KaTeX formula           |
| Images          | `![Alt Text](path/to/img.jpg)`       | `<img>` with caption          |
| Links           | `[Text](https://internal.link)`      | `<a>` (opens in new tab)      |
| Paragraphs      | Plain text lines                     |                               |

