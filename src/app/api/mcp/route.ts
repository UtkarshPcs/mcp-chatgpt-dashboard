import { createMcpHandler } from "mcp-handler";
import { registerSyllabusTools } from "./tools/syllabusTools";

const handler = createMcpHandler(
  async (server) => {
    registerSyllabusTools(server);
  }
);

export const GET = handler;
export const POST = handler;
