import { WASI, File, OpenFile, ConsoleStdout, PreopenDirectory } from "WASI";
import ghc_wasm_jsffi from "ffi";

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

await WebAssembly.compileStreaming( fetch("https://igem.erchius.xin/markdown/wizer.wasm") ).
    then( wasm => WebAssembly.instantiate(
        wasm,
        {
            "wasi_snapshot_preview1": wasi.wasiImport,
            ghc_wasm_jsffi: ghc_wasm_jsffi(instance_exports)
        }
    ) ).
    then( inst => {
        Object.assign( instance_exports, inst.exports )
        wasi.initialize(inst);
    } )

export default instance_exports;
