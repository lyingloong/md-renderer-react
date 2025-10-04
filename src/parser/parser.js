import parser from "./compiler.js";
export async function parseMarkdownToAST(mdContent) {
    return JSON.parse(await parser.parse(mdContent));
}