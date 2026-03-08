import { gooseRuntime } from "./goose.js";
import { ollamaRuntime } from "./ollama.js";
import { opencodeRuntime } from "./opencode.js";

const runtimeMap = new Map([
  [opencodeRuntime.id, opencodeRuntime],
  [ollamaRuntime.id, ollamaRuntime],
  [gooseRuntime.id, gooseRuntime],
]);

export function listRuntimeIds() {
  return [...runtimeMap.keys()];
}

export function getRuntimeAdapter(runtimeId) {
  const adapter = runtimeMap.get(runtimeId);
  if (!adapter) {
    throw new Error(`Unsupported runtime "${runtimeId}". Supported runtimes: ${listRuntimeIds().join(", ")}`);
  }
  return adapter;
}
