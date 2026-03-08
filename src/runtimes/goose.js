import { defineRuntimeAdapter } from "./types.js";
import { buildHostPrompt, parsePrefixArgs } from "./shared.js";

export const gooseRuntime = defineRuntimeAdapter({
  id: "goose",
  buildLaunchSpec(context) {
    const prefixArgs = parsePrefixArgs(context.env.HOST_AGENT_GOOSE_PREFIX_ARGS, "HOST_AGENT_GOOSE_PREFIX_ARGS");
    const command = context.env.HOST_AGENT_GOOSE_BIN || "goose";
    const args = [...prefixArgs, "run", "--text", buildHostPrompt(context), "--quiet", "--no-session"];
    const provider = context.env.HOST_AGENT_GOOSE_PROVIDER;

    if (provider) {
      args.push("--provider", provider);
    }

    if (context.model) {
      args.push("--model", context.model);
    }

    return { command, args };
  },
});
