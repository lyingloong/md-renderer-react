import { WASI, File, OpenFile, ConsoleStdout, PreopenDirectory } from "@bjorn3/browser_wasi_shim";
import ffi from "../ghc_wasm_jsffi.mjs";
import { readFile } from "node:fs/promises"

let args = [];
let env = [];
let fds = [
    new OpenFile(new File([])), // stdin
    ConsoleStdout.lineBuffered(msg => console.log(`[WASI stdout] ${msg}`, Object.getPrototypeOf(msg))),
    ConsoleStdout.lineBuffered(msg => console.warn(`[WASI stderr] ${msg}`)),
    new PreopenDirectory(".", []),
];
let wasi = new WASI(args, env, fds);

const wasmFile = await readFile(
    new URL("../../dist/wizer.wasm", import.meta.url).pathname
).then(file => WebAssembly.compile(file));
const instance_exports = {};
const wasmMod = await WebAssembly.instantiate(wasmFile, {
    wasi_snapshot_preview1: wasi.wasiImport,
    ghc_wasm_jsffi: ffi(instance_exports)
});
Object.assign(instance_exports, wasmMod.exports)
wasi.initialize(wasmMod);

export default instance_exports
