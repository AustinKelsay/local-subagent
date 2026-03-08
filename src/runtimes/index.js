import { opencodeRuntime } from "./opencode.js";

const runtimeMap = new Map([[opencodeRuntime.id, opencodeRuntime]]);

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
