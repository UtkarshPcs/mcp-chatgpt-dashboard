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
        description: "Retrieves the full syllabus hierarchy (Subjects and Chapters) along with their IDs. Always call this tool first if you need to update or delete a subject or chapter but don't know its ID.",
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
      "upsert_subject",
      {
        title: "Upsert Subject",
        description: "Creates a new subject or updates an existing one. To update, provide the existing 'id' (call get_syllabus_state if you don't know it). To create a new subject, leave 'id' empty.",
        inputSchema: z.object({
          id: z.string().optional().describe("Provide to update existing, omit to create new"),
          name: z.string().describe("Name of the subject (e.g. Physics)"),
          color: z.enum(['blue', 'red', 'emerald', 'amber', 'purple', 'rose']).optional().describe("Theme color")
        })
      },
      async (args) => {
        try {
          const now = new Date().toISOString();
          if (args.id) {
            // Update
            const { id, ...updates } = args;
            await update(ref(db, `subjects/${id}`), { ...updates, updatedAt: now });
            return { content: [{ type: "text", text: `Subject ${id} updated` }] };
          } else {
            // Create
            const newRef = await push(ref(db, "subjects"), {
              name: args.name,
              color: args.color || "blue",
              createdAt: now,
              updatedAt: now,
            });
            return { content: [{ type: "text", text: `Subject created with ID: ${newRef.key}` }] };
          }
        } catch (error: any) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    server.registerTool(
      "delete_subject",
      {
        title: "Delete Subject",
        description: "Deletes a subject. If you do not know the subject ID, call get_syllabus_state first to find it.",
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
      "upsert_chapters",
      {
        title: "Bulk Upsert Chapters",
        description: "Creates or updates multiple chapters at once. Pass an array of chapter objects. For each object: to update, provide the existing 'id'. To create a new chapter, leave 'id' empty but you MUST provide 'subjectId' and 'title'.",
        inputSchema: z.object({
          chapters: z.array(z.object({
            id: z.string().optional().describe("Provide to update existing, omit to create new"),
            subjectId: z.string().optional().describe("ID of the parent subject"),
            title: z.string().optional().describe("Chapter title"),
            progress: z.number().min(0).max(100).optional().describe("Completion percentage 0-100"),
            status: z.enum(['not_started', 'in_progress', 'revision', 'completed']).optional(),
            priority: z.enum(['low', 'medium', 'high']).optional(),
            estimatedTime: z.string().optional(),
            targetDate: z.string().optional(),
            notes: z.string().optional()
          }))
        })
      },
      async (args) => {
        try {
          const now = new Date().toISOString();
          const results = [];
          
          for (const chap of args.chapters) {
            if (chap.id) {
              // Update
              const { id, ...updates } = chap;
              const finalUpdates = { ...updates, updatedAt: now };
              
              if (finalUpdates.status === 'completed' && finalUpdates.progress === undefined) {
                 finalUpdates.progress = 100;
              } else if (finalUpdates.progress === 100 && finalUpdates.status === undefined) {
                 finalUpdates.status = 'completed';
              }
              
              await update(ref(db, `chapters/${id}`), finalUpdates);
              results.push(`Updated ${id}`);
            } else {
              // Create
              if (!chap.subjectId || !chap.title) {
                results.push(`Failed to create chapter: subjectId and title are required`);
                continue;
              }
              const newRef = await push(ref(db, "chapters"), {
                subjectId: chap.subjectId,
                title: chap.title,
                progress: chap.progress || 0,
                status: chap.status || 'not_started',
                priority: chap.priority || 'medium',
                estimatedTime: chap.estimatedTime || "",
                targetDate: chap.targetDate || "",
                notes: chap.notes || "",
                createdAt: now,
                updatedAt: now,
              });
              results.push(`Created new chapter with ID: ${newRef.key}`);
            }
          }
          return { content: [{ type: "text", text: results.join('\n') }] };
        } catch (error: any) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    server.registerTool(
      "bulk_import_syllabus",
      {
        title: "Bulk Import Syllabus",
        description: "Creates multiple subjects and their nested chapters in a single operation. This is the BEST tool to use when you need to import an entire syllabus from scratch. Do not include 'id' or 'subjectId'.",
        inputSchema: z.object({
          subjects: z.array(z.object({
            name: z.string(),
            color: z.enum(['blue', 'red', 'emerald', 'amber', 'purple', 'rose']).optional(),
            chapters: z.array(z.object({
              title: z.string(),
              progress: z.number().min(0).max(100).optional(),
              status: z.enum(['not_started', 'in_progress', 'revision', 'completed']).optional(),
              priority: z.enum(['low', 'medium', 'high']).optional(),
              estimatedTime: z.string().optional(),
              targetDate: z.string().optional(),
              notes: z.string().optional()
            }))
          }))
        })
      },
      async (args) => {
        try {
          const now = new Date().toISOString();
          let subjectsCreated = 0;
          let chaptersCreated = 0;
          
          for (const sub of args.subjects) {
            const subRef = await push(ref(db, "subjects"), {
              name: sub.name,
              color: sub.color || "blue",
              createdAt: now,
              updatedAt: now,
            });
            subjectsCreated++;
            
            for (const chap of sub.chapters) {
              await push(ref(db, "chapters"), {
                subjectId: subRef.key,
                title: chap.title,
                progress: chap.progress || 0,
                status: chap.status || 'not_started',
                priority: chap.priority || 'medium',
                estimatedTime: chap.estimatedTime || "",
                targetDate: chap.targetDate || "",
                notes: chap.notes || "",
                createdAt: now,
                updatedAt: now,
              });
              chaptersCreated++;
            }
          }
          
          return { content: [{ type: "text", text: `Successfully imported ${subjectsCreated} subjects and ${chaptersCreated} chapters!` }] };
        } catch (error: any) {
          return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    server.registerTool(
      "delete_chapter",
      {
        title: "Delete Chapter",
        description: "Deletes a chapter. If you do not know the chapter ID, call get_syllabus_state first to find it.",
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
        description: "Updates the central AI Study Recommendation card. You MUST provide the correct chapterId and subjectId. If you do not know them, call get_syllabus_state first.",
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

  }
);

export const GET = handler;
export const POST = handler;
