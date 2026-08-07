import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { ref, push, update, remove, get, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { Task, TaskStatus, TaskPriority, Chapter, ChapterStatus, Subject, AIRecommendation } from "@/types";

const handler = createMcpHandler(
  async (server) => {
    // ---------------------------------------------------------
    // SYLLABUS TOOLS
    // ---------------------------------------------------------
    
    server.registerTool(
      "get_syllabus_state",
      {
        title: "Get Syllabus State",
        description: "Retrieves the full syllabus hierarchy (Subjects and Chapters) along with the current AI Recommendation.",
        inputSchema: z.object({})
      },
      async () => {
        try {
          const [subSnap, chapSnap, recSnap] = await Promise.all([
            get(ref(db, "subjects")),
            get(ref(db, "chapters")),
            get(ref(db, "recommendation"))
          ]);
          
          const parseNode = (snap: any) => {
            const data = snap.val();
            if (!data) return [];
            return Object.keys(data).map(key => ({ id: key, ...data[key] }));
          };
          
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                subjects: parseNode(subSnap),
                chapters: parseNode(chapSnap),
                recommendation: recSnap.val() || null
              }, null, 2) 
            }],
          };
        } catch (error: any) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    server.registerTool(
      "create_subject",
      {
        title: "Create Subject",
        description: "Creates a new subject in the syllabus",
        inputSchema: z.object({
          name: z.string().describe("Name of the subject (e.g. Physics)"),
          color: z.enum(['blue', 'red', 'emerald', 'amber', 'purple', 'rose']).optional().describe("Theme color")
        })
      },
      async (args) => {
        try {
          const now = new Date().toISOString();
          const newRef = await push(ref(db, "subjects"), {
            name: args.name,
            color: args.color || "blue",
            createdAt: now,
            updatedAt: now,
          });
          return { content: [{ type: "text", text: `Subject created with ID: ${newRef.key}` }] };
        } catch (error: any) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    server.registerTool(
      "update_subject",
      {
        title: "Update Subject",
        description: "Updates an existing subject (e.g., renaming it)",
        inputSchema: z.object({
          id: z.string(),
          name: z.string().optional(),
          color: z.string().optional()
        })
      },
      async (args) => {
        try {
          const { id, ...updates } = args;
          await update(ref(db, `subjects/${id}`), { ...updates, updatedAt: new Date().toISOString() });
          return { content: [{ type: "text", text: `Subject ${id} updated` }] };
        } catch (error: any) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    server.registerTool(
      "delete_subject",
      {
        title: "Delete Subject",
        description: "Deletes a subject",
        inputSchema: z.object({ id: z.string() })
      },
      async (args) => {
        try {
          await remove(ref(db, `subjects/${args.id}`));
          return { content: [{ type: "text", text: `Subject ${args.id} deleted` }] };
        } catch (error: any) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    server.registerTool(
      "create_chapter",
      {
        title: "Create Chapter",
        description: "Creates a new chapter within a subject",
        inputSchema: z.object({
          subjectId: z.string().describe("ID of the parent subject"),
          title: z.string().describe("Chapter title"),
          progress: z.number().min(0).max(100).optional().describe("Completion percentage 0-100"),
          status: z.enum(['not_started', 'in_progress', 'revision', 'completed']).optional(),
          priority: z.enum(['low', 'medium', 'high']).optional(),
          estimatedTime: z.string().optional(),
          targetDate: z.string().optional(),
          notes: z.string().optional()
        })
      },
      async (args) => {
        try {
          const now = new Date().toISOString();
          const newRef = await push(ref(db, "chapters"), {
            subjectId: args.subjectId,
            title: args.title,
            progress: args.progress || 0,
            status: args.status || 'not_started',
            priority: args.priority || 'medium',
            estimatedTime: args.estimatedTime || "",
            targetDate: args.targetDate || "",
            notes: args.notes || "",
            createdAt: now,
            updatedAt: now,
          });
          return { content: [{ type: "text", text: `Chapter created with ID: ${newRef.key}` }] };
        } catch (error: any) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    server.registerTool(
      "update_chapter",
      {
        title: "Update Chapter",
        description: "Updates properties of a chapter (progress, status, notes, etc.)",
        inputSchema: z.object({
          id: z.string(),
          subjectId: z.string().optional(),
          title: z.string().optional(),
          progress: z.number().min(0).max(100).optional(),
          status: z.enum(['not_started', 'in_progress', 'revision', 'completed']).optional(),
          priority: z.enum(['low', 'medium', 'high']).optional(),
          estimatedTime: z.string().optional(),
          targetDate: z.string().optional(),
          notes: z.string().optional()
        })
      },
      async (args) => {
        try {
          const { id, ...updates } = args;
          const finalUpdates = { ...updates, updatedAt: new Date().toISOString() };
          
          if (finalUpdates.status === 'completed' && finalUpdates.progress === undefined) {
             finalUpdates.progress = 100;
          } else if (finalUpdates.progress === 100 && finalUpdates.status === undefined) {
             finalUpdates.status = 'completed';
          }

          await update(ref(db, `chapters/${id}`), finalUpdates);
          return { content: [{ type: "text", text: `Chapter ${id} updated` }] };
        } catch (error: any) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    server.registerTool(
      "delete_chapter",
      {
        title: "Delete Chapter",
        description: "Deletes a chapter",
        inputSchema: z.object({ id: z.string() })
      },
      async (args) => {
        try {
          await remove(ref(db, `chapters/${args.id}`));
          return { content: [{ type: "text", text: `Chapter ${args.id} deleted` }] };
        } catch (error: any) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    server.registerTool(
      "update_ai_recommendation",
      {
        title: "Update AI Recommendation",
        description: "Updates the central AI Study Recommendation card telling the user exactly what to study next.",
        inputSchema: z.object({
          chapterId: z.string().describe("The ID of the recommended chapter"),
          subjectId: z.string().describe("The ID of the recommended subject"),
          reason: z.string().describe("A short compelling reason why they should study this now"),
          estimatedTime: z.string().describe("Estimated time to complete this session"),
          priority: z.enum(['low', 'medium', 'high'])
        })
      },
      async (args) => {
        try {
          await set(ref(db, `recommendation`), {
            ...args,
            updatedAt: new Date().toISOString()
          });
          return { content: [{ type: "text", text: `AI Recommendation updated successfully` }] };
        } catch (error: any) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    // ---------------------------------------------------------
    // TASKS TOOLS (kept for backwards compatibility/hybrid use)
    // ---------------------------------------------------------

    server.registerTool(
      "get_tasks",
      {
        title: "Get Dashboard Tasks",
        description: "Retrieves all standalone tasks.",
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
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    server.registerTool(
      "create_task",
      {
        title: "Create Task",
        description: "Creates a new standalone academic task",
        inputSchema: z.object({
          title: z.string(),
          subject: z.string().optional(),
          chapter: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(["current", "upcoming", "backlog", "completed"]).optional(),
          priority: z.enum(["low", "medium", "high"]).optional(),
          estimatedTime: z.string().optional(),
          dueDate: z.string().optional(),
          notes: z.string().optional(),
          tags: z.array(z.string()).optional()
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

          const newRef = await push(ref(db, "tasks"), taskData);
          return { content: [{ type: "text", text: `Task created with ID: ${newRef.key}` }] };
        } catch (error: any) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    server.registerTool(
      "update_task",
      {
        title: "Update Task",
        description: "Updates properties of an existing task.",
        inputSchema: z.object({
          id: z.string(),
          title: z.string().optional(),
          status: z.enum(["current", "upcoming", "backlog", "completed"]).optional(),
          progress: z.number().min(0).max(100).optional(),
          priority: z.enum(["low", "medium", "high"]).optional()
        })
      },
      async (args) => {
        try {
          const { id, ...updates } = args;
          const updatesWithTime = { ...updates, updatedAt: new Date().toISOString() };
          await update(ref(db, `tasks/${id}`), updatesWithTime);
          return { content: [{ type: "text", text: `Task ${id} updated` }] };
        } catch (error: any) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    server.registerTool(
      "delete_task",
      {
        title: "Delete Task",
        description: "Deletes a task completely.",
        inputSchema: z.object({ id: z.string() })
      },
      async (args) => {
        try {
          await remove(ref(db, `tasks/${args.id}`));
          return { content: [{ type: "text", text: `Task ${args.id} deleted` }] };
        } catch (error: any) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );
  }
);

export const GET = handler;
export const POST = handler;
