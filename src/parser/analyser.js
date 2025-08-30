import { WASI, File, OpenFile, ConsoleStdout, PreopenDirectory } from "../../node_modules/@bjorn3/browser_wasi_shim/dist/index.js";
// import ghc_wasm_jsffi from "../../dist/ghc_wasm_jsffi.mjs";

let ghc_wasm_jsffi = null;

const loadFFIModule = async () => {
  if (ghc_wasm_jsffi) return ghc_wasm_jsffi;

  try {
    const ffiModule = await import('../../dist/ghc_wasm_jsffi.mjs'); 
    ghc_wasm_jsffi = ffiModule.default || ffiModule;
    return ghc_wasm_jsffi;
  } catch (err) {
    throw new Error(`加载 ffi 模块失败: ${err.message}\n请确认 dist/ghc_wasm_jsffi.mjs 存在`);
  }
};

export const initWASM = async () => {
  let args = [];
  let env = [];
  let fds = [
      new OpenFile(new File([])), // stdin
      ConsoleStdout.lineBuffered(msg => console.log(`[WASI stdout] ${msg}`, Object.getPrototypeOf(msg))),
      ConsoleStdout.lineBuffered(msg => console.warn(`[WASI stderr] ${msg}`)),
      new PreopenDirectory(".", []),
  ];
  let wasi = new WASI(args, env, fds);

  const instance_exports = {};
  const ffi = await loadFFIModule();

  await WebAssembly.compileStreaming( fetch("https://igem.erchius.xin/markdown/wizer.wasm") )
      .then( wasm => WebAssembly.instantiate(
          wasm,
          {
              "wasi_snapshot_preview1": wasi.wasiImport,
              ghc_wasm_jsffi: ghc_wasm_jsffi(instance_exports)
          }
      ) )
      .then( inst => {
          Object.assign( instance_exports, inst.exports )
          wasi.initialize(inst);
      } );

  return instance_exports;
};

export default {};