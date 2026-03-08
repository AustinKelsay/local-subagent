import { defineRuntimeAdapter } from "./types.js";
import { buildHostPrompt, parsePrefixArgs } from "./shared.js";

export const ollamaRuntime = defineRuntimeAdapter({
  id: "ollama",
  buildLaunchSpec(context) {
    const prefixArgs = parsePrefixArgs(context.env.HOST_AGENT_OLLAMA_PREFIX_ARGS, "HOST_AGENT_OLLAMA_PREFIX_ARGS");
    const command = context.env.HOST_AGENT_OLLAMA_BIN || "ollama";
    const model = context.model || context.env.HOST_AGENT_OLLAMA_MODEL;

    if (!model) {
      throw new Error("ollama runtime requires --model or HOST_AGENT_OLLAMA_MODEL");
    }

    return {
      command,
      args: [...prefixArgs, "run", model, buildHostPrompt(context)],
    };
  },
});
