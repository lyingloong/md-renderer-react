import React from 'react';
import ReactDOM from 'react-dom/client';
import ReactDOMServer from 'react-dom/server'; 
import { ASTRenderer_React } from './renderer/md-renderer.js';
import { ensureLines, sleep } from './utils/helper.js';

import { parseMarkdownToAST } from './parser/analyser.js';

export default class MDRenderer {
  /**
   * 构造函数：初始化渲染器
   * @param {Object} options - 配置项
   * @param {string} [options.mode='react'] - 渲染模式（目前仅支持react）
   * @param {Object} [options.styles] - 自定义样式对象(scss)
   * @param {Function} [options.onLoading] - 加载中回调
   * @param {Function} [options.onSuccess] - 渲染成功回调
   * @param {Function} [options.onError] - 渲染失败回调
   */
  constructor(options = {}) {
    this.mode = options.mode || 'react'; // 目前仅支持React，预留扩展
    this.styles = options.styles ?? {};
    console.log("[MDRenderer] styles:", this.styles);
    this.onLoading = options.onLoading || (() => {});
    this.onSuccess = options.onSuccess || (() => {});
    this.onError = options.onError || ((err) => console.error('渲染失败:', err));
    
    this.reactRoots = new Map(); // 缓存React根实例（避免重复创建）
    this.isDestroyed = false; // 标记渲染器是否已销毁（防止内存泄漏）
  }

  /**
   * 生成 React 元素，不依赖 DOM 容器
   * @param {string} mdContent - MD 文本
   * @returns {Promise<React.Element>} React 元素（ASTRenderer_React包裹AST）
   */
  async renderToElement(mdContent) {
    if (this.isDestroyed) {
      throw new Error('渲染器已销毁，无法使用 renderToElement');
    }

    if (typeof mdContent !== 'string') {
      throw new Error('mdContent 必须是字符串');
    }

    try {
      const astResult = await parseMarkdownToAST(mdContent);

      let ast = null;
      if (Array.isArray(astResult)) {
        ast = astResult;
      } else if (astResult && astResult.data) {
        ast = astResult.data;
      } else {
        console.warn("[renderToElement] 未识别的 astResult 结构:", astResult);
        ast = [];
      }

    const reactElement = <ASTRenderer_React ast={ast} styles={this.styles}/>;
    this.onSuccess?.({ ast, reactElement });
    return reactElement;

    } catch (err) {
      this.onError(err);
      return <div style={{ color: 'red' }}>error: {err.message}</div>;
    }
  }


  /**
   * 渲染MD内容到指定容器
   * @param {HTMLElement} container - 外部提供的渲染容器（必需）
   * @param {string} mdContent - 需要渲染的MD文本内容（必需）
   */
  async renderToContainer(container, mdContent) {
    // 校验参数合法性
    if (!container || !(container instanceof HTMLElement)) {
      const err = new Error('必须传入有效的DOM容器');
      this.onError(err);
      throw err;
    }
    if (typeof mdContent !== 'string') {
      const err = new Error('MD内容必须是字符串');
      this.onError(err);
      throw err;
    }
    if (this.isDestroyed) {
      const err = new Error('渲染器已销毁，无法继续使用');
      this.onError(err);
      throw err;
    }

    try {
      // 1. 触发加载中回调
      this.onLoading(container);

      // 2. 解析MD内容为AST
      const astResult = parseMarkdownToAST(mdContent);
      if (this.isDestroyed) return; // 若已销毁，终止流程

      // 3. 处理解析结果（区分错误和正常AST）
      const { isError, data: astOrErr } = astResult;
      if (isError) {
        this._renderError(container, astOrErr);
        this.onError(new Error(astOrErr));
        return;
      }

      // 4. 渲染AST到容器（目前仅React模式）
      if (this.mode === 'react') {
        this._renderReact(container, astOrErr);
      } else {
        throw new Error(`不支持的渲染模式: ${this.mode}`);
      }

      // 5. 触发成功回调
      this.onSuccess({ container, ast: astOrErr });

    } catch (err) {
      // 统一错误处理
      this._renderError(container, err.message);
      this.onError(err);
    }
  }

  /**
   * 不依赖 DOM 容器，直接返回 MD 渲染后的字符串代码（React 元素对应的 HTML/JSX 字符串）
   * @param {string} mdContent - 需要处理的 MD 文本
   * @returns {Promise<Object>} { success: boolean, data: string } - data 是渲染后的字符串代码
   */
  async getRenderedCode(mdContent) {
    try {
      // 1. 解析 MD 为 AST
      const ast = await parseMarkdownToAST(mdContent);

      // 2. 生成 React 元素
      const reactElement = <ASTRenderer_React ast={ast} styles={this.styles}/>;

      // 3. 转成字符串形式的代码
      // renderToStaticMarkup：生成无 React 属性（如 data-reactid）的纯 HTML/JSX 字符串
      const renderedCode = ReactDOMServer.renderToStaticMarkup(reactElement);

      // 4. 触发成功回调（可选）
      this.onSuccess({ ast, renderedCode });

      return { success: true, data: renderedCode };

    } catch (err) {
      const errMsg = `获取渲染代码失败: ${err.message}`;
      this.onError(new Error(errMsg));
      return { success: false, data: errMsg };
    }
  }

  /**
   * 私有方法：解析MD到AST（调用wasm解析器）
   * @param {string} mdContent - MD文本
   * @returns {Object} { isError: boolean, data: AST|string }
   */
  async _parseMdToAst(mdContent) {
    try {
      // 若已初始化 WASM 实例，直接复用
      if (!this.wasmInstance) {
        // 等待动态导入 analyser.js 完成
        const analyser = await analyserImport;
        // 调用 initWASM 函数初始化 WASM（关键修改）
        this.wasmInstance = await analyser.initWASM();
        // 验证实例是否包含 parse 方法（兼容原逻辑）
        if (typeof this.wasmInstance.parse !== 'function') {
          throw new Error('WASM 实例缺少 parse 方法（初始化异常）');
        }
      }
      const { parse, problems } = this.wasmInstance; // 从缓存实例中取方法
      const formattedContent = ensureLines(mdContent);
      
      const gap = sleep(100);
      const [_, parseResult] = await Promise.allSettled([gap, parse(formattedContent)]);

      if (parseResult.status !== 'fulfilled') {
        return { isError: true, data: parseResult.reason.message || '解析器执行失败' };
      }

      const rawData = parseResult.value;
      if (typeof rawData === 'string' && rawData.startsWith('"stdin"')) {
        return { isError: true, data: rawData };
      }

      const ast = JSON.parse(rawData);
      return { isError: false, data: ast };

    } catch (err) {
      this.wasmInstance = null;
      return { isError: true, data: `解析过程出错: ${err.message}` };
    }
  }

  /**
   * 私有方法：React渲染逻辑
   * @param {HTMLElement} container - 渲染容器
   * @param {Array} ast - 解析后的AST
   */
  _renderReact(container, ast) {
    // 复用React根实例（性能优化，避免重复创建）
    if (!this.reactRoots.has(container)) {
      this.reactRoots.set(container, ReactDOM.createRoot(container));
    }
    const reactRoot = this.reactRoots.get(container);

    // 渲染React组件（使用ASTRenderer_React处理AST）
    reactRoot.render(
      <React.StrictMode>
        <ASTRenderer_React ast={ast} styles={this.styles}/>
      </React.StrictMode>
    );
  }

  /**
   * 私有方法：渲染错误信息到容器
   * @param {HTMLElement} container - 渲染容器
   * @param {string} errorMsg - 错误信息
   */
  _renderError(container, errorMsg) {
    // 清空容器并渲染错误样式
    container.innerHTML = '';
    const errorElement = document.createElement('div');
    errorElement.className = 'md-render-error';
    errorElement.style.cssText = `
      padding: 16px;
      background: #fff5f5;
      border: 1px solid #ffccc7;
      border-radius: 4px;
      color: #f5222d;
      font-family: sans-serif;
    `;
    errorElement.innerHTML = `
      <h3 style="margin: 0 0 8px; font-size: 16px;">MD渲染错误</h3>
      <pre style="margin: 0; white-space: pre-wrap; word-break: break-all;">${errorMsg}</pre>
    `;
    container.appendChild(errorElement);
  }

  /**
   * 销毁方法：清理React根实例，防止内存泄漏
   * @param {HTMLElement} [container] - 可选：仅销毁指定容器的实例；不传则销毁所有
   */
  destroy(container) {
    this.isDestroyed = true;
    if (container) {
      // 销毁指定容器的React根
      if (this.reactRoots.has(container)) {
        const reactRoot = this.reactRoots.get(container);
        reactRoot.unmount(); // 卸载React组件
        this.reactRoots.delete(container);
      }
    } else {
      // 销毁所有容器的React根
      this.reactRoots.forEach((reactRoot) => reactRoot.unmount());
      this.reactRoots.clear();
    }
    this.wasmInstance = null;
  }
}

// 导出默认单例实例
export const mdRenderer = new MDRenderer();