import { ASTnode2DOM_React } from "./ast-react.js";
import React, { useEffect, useState } from 'react';

export function ASTRenderer_React({ ast }) {
  console.log("[ASTRenderer_React] ast", ast);
  return (
    <div className="react-rendered-content">
      {ast.map((node, index) => (
        <React.Fragment key={index}>
          {ASTnode2DOM_React(node)}
        </React.Fragment>
      ))}
    </div>
  );
}