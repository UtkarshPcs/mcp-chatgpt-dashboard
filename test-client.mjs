import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function main() {
  console.log("Connecting to MCP HTTP endpoint...");
  const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost:3000/api/mcp")
  );

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    console.log("Connected successfully!");

    // List tools
    console.log("Listing tools...");
    const tools = await client.listTools();
    console.log("Tools available:", JSON.stringify(tools, null, 2));

    // Call tool
    console.log("Calling create_task tool...");
    const result = await client.callTool({
      name: "create_task",
      arguments: {
        title: "Test Task from Node Script via HTTP Transport"
      }
    });

    console.log("Tool result:", JSON.stringify(result, null, 2));

  } catch (error) {
    console.error("Error occurred:", error);
  } finally {
    console.log("Closing connection...");
    process.exit(0);
  }
}

main();
