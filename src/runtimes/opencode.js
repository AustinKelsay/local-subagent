import { defineRuntimeAdapter } from "./types.js";
import { buildHostPrompt, parsePrefixArgs } from "./shared.js";

export const opencodeRuntime = defineRuntimeAdapter({
  id: "opencode",
  buildLaunchSpec(context) {
    const prefixArgs = parsePrefixArgs(
      context.env.HOST_AGENT_OPENCODE_PREFIX_ARGS,
      "HOST_AGENT_OPENCODE_PREFIX_ARGS",
    );
    const command = context.env.HOST_AGENT_OPENCODE_BIN || "opencode";
    const args = [...prefixArgs, "run"];

    if (context.model) {
      args.push("--model", context.model);
    }

    args.push(buildHostPrompt(context));

    return { command, args };
  },
});
