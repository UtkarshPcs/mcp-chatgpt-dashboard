import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { ref, push, update, remove, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { Task, TaskStatus, TaskPriority } from "@/types";

const handler = createMcpHandler(
  async (server) => {
    // 1. get_dashboard_state
    server.registerTool(
      "get_dashboard_state",
      {
        title: "Get Dashboard State",
        description: "Retrieves all tasks on the dashboard. Use this to understand the current state before making updates or when the user asks for a summary.",
        inputSchema: z.object({})
      },
      async () => {
        try {
          const snapshot = await get(ref(db, "tasks"));
          const data = snapshot.val();
          const tasks: Task[] = [];
          if (data) {
            Object.keys(data).forEach((key) => {
              tasks.push({ id: key, ...data[key] });
            });
          }
          return {
            content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }],
          };
        } catch (error: any) {
          return {
            content: [{ type: "text", text: `Error fetching state: ${error.message}` }],
            isError: true,
          };
        }
      }
    );

    // 2. create_task
    server.registerTool(
      "create_task",
      {
        title: "Create Task",
        description: "Creates a new academic task",
        inputSchema: z.object({
          title: z.string().describe("Task title"),
          subject: z.string().optional().describe("Subject (e.g. Physics)"),
          chapter: z.string().optional().describe("Chapter name or number"),
          description: z.string().optional().describe("Detailed description"),
          status: z.enum(["current", "upcoming", "backlog", "completed"]).optional().describe("Task section (default: upcoming)"),
          priority: z.enum(["low", "medium", "high"]).optional().describe("Priority level (default: medium)"),
          estimatedTime: z.string().optional().describe("Estimated time (e.g. 2 hours)"),
          dueDate: z.string().optional().describe("Due date in ISO format"),
          notes: z.string().optional().describe("Additional notes"),
          tags: z.array(z.string()).optional().describe("Tags")
        })
      },
      async (args) => {
        try {
          const now = new Date().toISOString();
          const taskData: Omit<Task, 'id'> = {
            title: args.title,
            subject: args.subject || "",
            chapter: args.chapter || "",
            description: args.description || "",
            status: (args.status as TaskStatus) || "upcoming",
            progress: args.status === "completed" ? 100 : 0,
            priority: (args.priority as TaskPriority) || "medium",
            estimatedTime: args.estimatedTime || "",
            dueDate: args.dueDate || "",
            notes: args.notes || "",
            tags: args.tags || [],
            createdAt: now,
            updatedAt: now,
          };

          const newTaskRef = await push(ref(db, "tasks"), taskData);
          return {
            content: [{ type: "text", text: `Task created successfully with ID: ${newTaskRef.key}` }],
          };
        } catch (error: any) {
          return {
            content: [{ type: "text", text: `Error creating task: ${error.message}` }],
            isError: true,
          };
        }
      }
    );

    // 3. update_task
    server.registerTool(
      "update_task",
      {
        title: "Update Task",
        description: "Updates properties of an existing task.",
        inputSchema: z.object({
          id: z.string().describe("Task ID to update"),
          title: z.string().optional(),
          subject: z.string().optional(),
          chapter: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(["current", "upcoming", "backlog", "completed"]).optional(),
          progress: z.number().min(0).max(100).optional().describe("Progress percentage (0-100)"),
          priority: z.enum(["low", "medium", "high"]).optional(),
          estimatedTime: z.string().optional(),
          dueDate: z.string().optional(),
          notes: z.string().optional(),
          tags: z.array(z.string()).optional()
        })
      },
      async (args) => {
        try {
          const { id, ...updates } = args;
          const updatesWithTime = { ...updates, updatedAt: new Date().toISOString() };
          
          if (updates.status === 'completed' && updates.progress === undefined) {
             updatesWithTime.progress = 100;
          }
          
          await update(ref(db, `tasks/${id}`), updatesWithTime);
          return {
            content: [{ type: "text", text: `Task ${id} updated successfully` }],
          };
        } catch (error: any) {
          return {
            content: [{ type: "text", text: `Error updating task: ${error.message}` }],
            isError: true,
          };
        }
      }
    );

    // 4. update_task_status
    server.registerTool(
      "update_task_status",
      {
        title: "Update Task Status",
        description: "Quickly move a task to a different section (e.g. to Current Focus, Completed, etc.)",
        inputSchema: z.object({
          id: z.string().describe("Task ID"),
          status: z.enum(["current", "upcoming", "backlog", "completed"]).describe("New status")
        })
      },
      async (args) => {
        try {
          const updates: any = { 
            status: args.status, 
            updatedAt: new Date().toISOString() 
          };
          if (args.status === 'completed') updates.progress = 100;
          await update(ref(db, `tasks/${args.id}`), updates);
          return {
            content: [{ type: "text", text: `Task ${args.id} moved to ${args.status}` }],
          };
        } catch (error: any) {
          return {
            content: [{ type: "text", text: `Error updating status: ${error.message}` }],
            isError: true,
          };
        }
      }
    );

    // 5. delete_task
    server.registerTool(
      "delete_task",
      {
        title: "Delete Task",
        description: "Deletes a task completely.",
        inputSchema: z.object({
          id: z.string().describe("Task ID to delete")
        })
      },
      async (args) => {
        try {
          await remove(ref(db, `tasks/${args.id}`));
          return {
            content: [{ type: "text", text: `Task ${args.id} deleted successfully` }],
          };
        } catch (error: any) {
          return {
            content: [{ type: "text", text: `Error deleting task: ${error.message}` }],
            isError: true,
          };
        }
      }
    );
  }
);

export const GET = handler;
export const POST = handler;
