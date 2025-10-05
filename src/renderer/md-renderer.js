import { ASTnode2DOM_React } from "./ast-react.js";
import React, { useEffect, useState } from 'react';

export function ASTRenderer_React({ ast, styles }) {
  // console.log("[ASTRenderer_React] ast", ast);
  const flattened = Array.isArray(ast[0]) ? ast.flat() : ast;
  console.log("[ASTRenderer_React] AST(flattened):", flattened);
  return (
    <div className="react-rendered-content">
      {flattened.map((node, index) => (
        <React.Fragment key={index}>
          {ASTnode2DOM_React(node, styles)}
        </React.Fragment>
      ))}
    </div>
  );
}