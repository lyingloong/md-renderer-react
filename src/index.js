import MDRenderer, { mdRenderer } from './MDRenderer.js';

import { ASTRenderer_React } from './renderer/md-renderer.js';
import { ASTnode2DOM_React } from './renderer/ast-react.js';

import * as helperUtils from './utils/helper.js';
import * as parser from './parser/analyser.js';

export {
  MDRenderer,  // 渲染器类
  mdRenderer,  // 默认单例实例

  ASTRenderer_React,  // AST→React组件的顶层渲染器
  ASTnode2DOM_React,  // 单个AST节点→React DOM的转换函数

  helperUtils,
  parser
};

export default mdRenderer;