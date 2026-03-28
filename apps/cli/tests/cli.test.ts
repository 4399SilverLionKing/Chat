import { describe, expect, it } from "vitest";

import { createCli } from "../src/cli.js";

describe("createCli", () => {
  it("registers only the supported CLI commands", () => {
    const program = createCli();
    const commandNames = program.commands.map((command) => command.name());

    expect(commandNames).toContain("analyze-chat-profile");
    expect(commandNames).toContain("fetch-chat-context");
    expect(commandNames).toContain("show-contact");
    expect(commandNames).not.toContain("generate-reply-strategy");
  });
});
