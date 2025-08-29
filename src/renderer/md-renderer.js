import React from 'react';
import { ASTnode2DOM_React } from "./ast-react.js";


// 预处理函数：递归清洗AST中的冗余节点
const cleanAST = (node) => {
  if (!node) return node;

  // 1. 处理当前节点的content（可能是数组、对象或其他类型）
  if (Array.isArray(node.content)) {
    // 数组类型：逐个清洗子节点
    node.content = node.content.map(child => cleanAST(child));
  } else if (typeof node.content === 'object' && node.content !== null) {
    // 对象类型：递归清洗content
    node.content = cleanAST(node.content);
  }

  // 2. 处理格式化节点（italic/bold/underlined）内部的冗余paragraph
  // 注意：这里放在content处理之后，确保先清理子节点，再处理当前节点
  if (['italic', 'bold', 'underlined'].includes(node.type)) {
    const content = node.content;
    if (content?.type === 'paragraph' && 
        Array.isArray(content.content) && 
        content.content.length === 1 
        // && content.content[0].type === 'plain'
    ) {
      node.content = content.content[0];
    }
  }

  // 3. 过滤空段落
  if (node.type === 'paragraph' && 
      Array.isArray(node.content) && 
      node.content.length === 0) {
    return null;
  }
  
  return node;
};


export function ASTRenderer_React({ ast }) {
    console.log("ast", ast);
    const cleanedAST = ast.flat(1).map(node => cleanAST(node));
    console.log("cleanedAST", cleanedAST);
    return (
        <div className="react-rendered-content">
            {cleanedAST.map((node, index) => (
                <React.Fragment key={index}>
                    {ASTnode2DOM_React(node)}
                </React.Fragment>
            ))}
        </div>
    );
}