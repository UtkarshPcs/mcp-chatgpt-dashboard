import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const handler = createMcpHandler(
  async (server) => {
    server.registerTool(
      "create_task",
      {
        title: "Create Task",
        description: "Creates a new task in the database",
        inputSchema: z.object({
          title: z.string().describe("The title of the task to create")
        })
      },
      async (args) => {
        try {
          const docRef = await addDoc(collection(db, "tasks"), {
            title: args.title,
            completed: false,
            createdAt: new Date().toISOString(),
          });
          return {
            content: [{ type: "text", text: `Task created successfully with ID: ${docRef.id}` }],
          };
        } catch (error: any) {
          return {
            content: [{ type: "text", text: `Error creating task: ${error.message}` }],
            isError: true,
          };
        }
      }
    );
  }
);

export const GET = handler;
export const POST = handler;
