import { describe, expect, it } from "vitest";

import { createCli } from "../src/cli.js";

describe("createCli", () => {
  it("registers analyze-chat-profile command", () => {
    const program = createCli();

    expect(program.commands.map((command) => command.name())).toContain(
      "analyze-chat-profile",
    );
  });
});
