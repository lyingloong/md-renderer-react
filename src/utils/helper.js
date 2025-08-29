/**
 * 确保字符串以换行结尾
 * @param {string} str - 输入字符串
 * @returns {string} 处理后的字符串
 */
export function ensureLines(str) {
  return typeof str === 'string' && !str.endsWith('\n') ? `${str}\n` : str;
}

/**
 * 延迟函数（模拟异步等待，避免UI阻塞）
 * @param {number} timeout - 延迟时间（毫秒）
 * @returns {Promise} 延迟后的Promise
 */
export function sleep(timeout) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

/**
 * 校验AST合法性（可选）
 * @param {any} ast - 需要校验的AST
 * @returns {boolean} 是否合法
 */
export function isLegalAst(ast) {
  return Array.isArray(ast) && ast.every(item => item && typeof item.type === 'string');
}