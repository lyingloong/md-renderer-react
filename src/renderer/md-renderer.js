import { ASTnode2DOM_React } from "./ast-react.js";
import React, { useEffect, useState } from 'react';

export function ASTRenderer_React({ ast, styles }) {
  console.log("[ASTRenderer_React] ast", ast);
  return (
    <div className="react-rendered-content">
      {ast.map((node, index) => (
        <React.Fragment key={index}>
          {ASTnode2DOM_React(node, styles)}
        </React.Fragment>
      ))}
    </div>
  );
}