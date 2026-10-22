import { z } from "zod";
import { ref, push, update, remove, get, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { 
  parseTimeRangeToMinutes, 
  formatTimeRangeDisplay, 
  calculatePeriodicStudyStats 
} from "@/utils/timeCalculations";

const ensureSubjectFramework = async (subjectId: string) => {
  const snap = await get(ref(db, `subjects/${subjectId}`));
  const subject = snap.val();
  if (!subject) throw new Error(`Subject with ID ${subjectId} not found.`);
  if (!subject.tasks || subject.tasks.length === 0) {
    throw new Error(`The subject '${subject.name}' does not have a Subject-wise Framework yet. The framework must first be created under the owner's guidance before this academic action can be performed. Do NOT fall back to legacy chapter records.`);
  }
  return subject;
};


export const registerSyllabusTools = (server: any) => {

  server.registerTool(
    "get_legacy_data",
    {
      title: "Get Legacy Historical Data",
      description: "Retrieves the raw, historical legacy academic data including old progress percentages, legacy revisions, and chapters without a Subject-wise Framework. Only use this when explicitly asked to view or retrieve legacy/historical data.",
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
      } catch (e: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${e.message}` }] };
      }
    }
  );

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
          
          const rawSubjects = parseNode(subSnap);
          const rawChapters = parseNode(chapSnap);
          const rawRec = recSnap.val() || null;
          
          // Filter to ONLY framework subjects for active view
          const activeChapters = rawChapters.map((chap: any) => {
            const sub = rawSubjects.find((s: any) => s.id === chap.subjectId);
            const hasFramework = sub && sub.tasks && sub.tasks.length > 0;
            if (!hasFramework) {
              return { ...chap, progress: 0, status: 'not_started', nextRevisionDate: undefined, lastRevisionDate: undefined, revisionCount: 0 };
            }
            // Framework progress
            const totalWeight = sub.tasks.reduce((sum: number, t: any) => sum + t.weight, 0);
            const completedWeight = totalWeight === 0 ? 0 : sub.tasks.reduce((sum: number, t: any) => {
              if (chap.tasks && chap.tasks[t.id] && chap.tasks[t.id].status === 'completed') return sum + t.weight;
              return sum;
            }, 0);
            const progress = totalWeight === 0 ? 0 : Math.round((completedWeight / totalWeight) * 100);
            const status = progress === 0 ? 'not_started' : progress === 100 ? 'completed' : 'in_progress';
            return {
              ...chap,
              progress,
              status,
              ...(progress === 0 ? { nextRevisionDate: undefined, lastRevisionDate: undefined, revisionCount: 0 } : {})
            };
          });
          
          let activeRec = rawRec;
          if (activeRec) {
            const sub = rawSubjects.find((s: any) => s.id === activeRec.subjectId);
            if (!sub || !sub.tasks || sub.tasks.length === 0) {
              activeRec = null;
            }
          }

          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                subjects: rawSubjects,
                chapters: activeChapters,
                recommendation: activeRec
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
        section: z.enum(['Science', 'Mathematics', 'Social Science (SST)', 'English', 'Hindi', 'Information Technology (IT)', 'Other']).optional().describe("Parent section"),
        color: z.enum(['blue', 'red', 'emerald', 'amber', 'purple', 'rose']).optional().describe("Theme color")
      })
    },
    async (args: any) => {
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
            section: args.section || 'Other',
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
    async (args: any) => {
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
          notes: z.string().optional(),
          lastRevisionDate: z.string().optional(),
          nextRevisionDate: z.string().optional(),
          revisionCount: z.number().optional()
        }))
      })
    },
    async (args: any) => {
      try {
        
        // For each chapter, check if subject has framework
        for (const chap of args.chapters) {
          let sId = chap.subjectId;
          if (!sId && chap.id) {
            const cSnap = await get(ref(db, `chapters/${chap.id}`));
            if (cSnap.exists()) sId = cSnap.val().subjectId;
          }
          if (sId) await ensureSubjectFramework(sId);
        }

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
              lastRevisionDate: chap.lastRevisionDate || "",
              nextRevisionDate: chap.nextRevisionDate || "",
              revisionCount: chap.revisionCount || 0,
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
      description: "Creates multiple subjects and their nested chapters in a single operation. Provide 'jsonData' as a raw JSON string matching: { subjects: [ { name: '...', color: '...', chapters: [ { title: '...', progress: 0, status: '...', priority: '...' } ] } ] }.",
      inputSchema: z.object({
        jsonData: z.string().describe("A JSON string containing the subjects array.")
      })
    },
    async (args: any) => {
      try {
        const now = new Date().toISOString();
        let parsedData;
        try {
          parsedData = JSON.parse(args.jsonData);
        } catch (e) {
          return { content: [{ type: "text", text: "Error: Invalid JSON string provided." }], isError: true };
        }
        
        if (!parsedData.subjects || !Array.isArray(parsedData.subjects)) {
          return { content: [{ type: "text", text: "Error: JSON must contain a 'subjects' array." }], isError: true };
        }

        let subjectsCreated = 0;
        let chaptersCreated = 0;
        
        for (const sub of parsedData.subjects) {
          const subRef = await push(ref(db, "subjects"), {
            name: sub.name,
            section: sub.section || 'Other',
            color: sub.color || "blue",
            createdAt: now,
            updatedAt: now,
          });
          subjectsCreated++;
          
          if (Array.isArray(sub.chapters)) {
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
    async (args: any) => {
      try {
        
        const cSnap = await get(ref(db, `chapters/${args.id}`));
        if (cSnap.exists()) {
          const sId = cSnap.val().subjectId;
          if (sId) await ensureSubjectFramework(sId);
        }

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
    async (args: any) => {
      try {
        
        await ensureSubjectFramework(args.subjectId);

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

  server.registerTool(
    "record_chapter_revision",
    {
      title: "Record Chapter Revision",
      description: "Updates a chapter's revision dates. ALWAYS use this tool when the user completes a revision, rather than updating notes. You MUST calculate the nextRevisionDate based on spaced repetition (e.g., 1st revision = +1 day, 2nd = +3 days, 3rd = +7 days).",
      inputSchema: z.object({
        id: z.string().describe("The ID of the chapter being revised"),
        lastRevisionDate: z.string().describe("ISO date string for when this revision was completed (e.g. 2026-08-12T00:00:00.000Z)"),
        nextRevisionDate: z.string().describe("ISO date string for the next scheduled revision based on spaced repetition")
      })
    },
    async (args: any) => {
      try {
        
        const cSnap = await get(ref(db, `chapters/${args.id}`));
        if (!cSnap.exists()) throw new Error("Chapter not found");
        await ensureSubjectFramework(cSnap.val().subjectId);

        const snap = await get(ref(db, `chapters/${args.id}`));
        if (!snap.exists()) {
           return { content: [{ type: "text", text: `Error: Chapter ${args.id} not found` }], isError: true };
        }
        
        const chapter = snap.val();
        const currentCount = chapter.revisionCount || 0;
        
        await update(ref(db, `chapters/${args.id}`), {
          lastRevisionDate: args.lastRevisionDate,
          nextRevisionDate: args.nextRevisionDate,
          revisionCount: currentCount + 1,
          status: "revision",
          updatedAt: new Date().toISOString()
        });
        
        return { content: [{ type: "text", text: `Successfully recorded revision for chapter ${args.id}. Next revision scheduled for ${args.nextRevisionDate}.` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "get_delayed_revisions",
    {
      title: "Get Delayed Revisions",
      description: "Retrieves all chapters that have a scheduled revision date that has already passed.",
      inputSchema: z.object({})
    },
    async () => {
      try {
        const chapSnap = await get(ref(db, "chapters"));
        const data = chapSnap.val();
        if (!data) return { content: [{ type: "text", text: "[]" }] };
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const delayed = Object.keys(data).map(key => ({ id: key, ...data[key] })).filter(c => {
           if (!c.nextRevisionDate) return false;
           const revDate = new Date(c.nextRevisionDate);
           revDate.setHours(0, 0, 0, 0);
           return revDate.getTime() < now.getTime();
        });
        
        return { content: [{ type: "text", text: JSON.stringify(delayed, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "mark_revision_complete",
    {
      title: "Mark Revision Complete",
      description: "Marks a chapter's pending revision as completed. It increments the revision count (max 3), updates lastRevisionDate to today, and clears nextRevisionDate.",
      inputSchema: z.object({
        id: z.string().describe("The ID of the chapter")
      })
    },
    async (args: any) => {
      try {
        
        const cSnap = await get(ref(db, `chapters/${args.id}`));
        if (!cSnap.exists()) throw new Error("Chapter not found");
        await ensureSubjectFramework(cSnap.val().subjectId);

        const snap = await get(ref(db, `chapters/${args.id}`));
        if (!snap.exists()) {
           return { content: [{ type: "text", text: `Error: Chapter ${args.id} not found` }], isError: true };
        }
        const chapter = snap.val();
        const currentCount = chapter.revisionCount || 0;
        if (currentCount >= 3) {
           return { content: [{ type: "text", text: `Chapter ${args.id} has already reached the maximum of 3 revisions.` }] };
        }
        
        await update(ref(db, `chapters/${args.id}`), {
          revisionCount: currentCount + 1,
          lastRevisionDate: new Date().toISOString(),
          nextRevisionDate: null,
          updatedAt: new Date().toISOString()
        });
        
        return { content: [{ type: "text", text: `Successfully marked revision complete for chapter ${args.id}. Current revision count is now ${currentCount + 1}/3.` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
  server.registerTool(
    "manage_subject_template",
    {
      title: "Manage Subject Task Template",
      description: "Creates, updates, or reorders the task framework for a specific subject. Overwrites the existing template. Provide an array of tasks with names, weights (must sum to 100), and order.",
      inputSchema: z.object({
        subjectId: z.string().describe("The unique ID of the subject to manage (e.g., 'physics_12')"),
        tasks: z.array(z.object({
          id: z.string().describe("A unique string ID for the task (e.g., 'physics_lecture')"),
          name: z.string().describe("Display name (e.g., 'Watch Lecture')"),
          weight: z.number().describe("Percentage weight of this task (0-100)"),
          order: z.number().describe("Sorting order")
        })).describe("The complete array of tasks that make up the framework for this subject")
      })
    },
    async (args: any) => {
      try {
        const snap = await get(ref(db, `subjects/${args.subjectId}`));
        if (!snap.exists()) {
           return { content: [{ type: "text", text: `Error: Subject ${args.subjectId} not found` }], isError: true };
        }
        
        const totalWeight = args.tasks.reduce((sum: number, t: any) => sum + t.weight, 0);
        if (Math.abs(totalWeight - 100) > 0.1 && args.tasks.length > 0) {
           return { content: [{ type: "text", text: `Error: Task weights must sum to exactly 100. Current sum is ${totalWeight}` }], isError: true };
        }

        await update(ref(db, `subjects/${args.subjectId}`), {
          tasks: args.tasks,
          updatedAt: new Date().toISOString()
        });
        
        return { content: [{ type: "text", text: `Successfully updated task template for subject ${args.subjectId}.` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "update_chapter_task",
    {
      title: "Update Chapter Task Status",
      description: "Marks a specific task as completed or not_started for a particular chapter.",
      inputSchema: z.object({
        chapterId: z.string().describe("The unique ID of the chapter to update"),
        taskId: z.string().describe("The ID of the task from the subject's task template"),
        status: z.enum(['completed', 'not_started']).describe("The new completion status ('completed' or 'not_started')")
      })
    },
    async (args: any) => {
      try {
        
        const cSnap = await get(ref(db, `chapters/${args.chapterId}`));
        if (!cSnap.exists()) throw new Error("Chapter not found");
        await ensureSubjectFramework(cSnap.val().subjectId);

        const snap = await get(ref(db, `chapters/${args.chapterId}`));
        if (!snap.exists()) {
           return { content: [{ type: "text", text: `Error: Chapter ${args.chapterId} not found` }], isError: true };
        }
        
        const updatePath = `chapters/${args.chapterId}/tasks/${args.taskId}`;
        await update(ref(db), {
          [`${updatePath}/status`]: args.status,
          [`${updatePath}/completedAt`]: args.status === 'completed' ? new Date().toISOString() : null,
          [`chapters/${args.chapterId}/updatedAt`]: new Date().toISOString()
        });
        
        return { content: [{ type: "text", text: `Successfully marked task ${args.taskId} as ${args.status} for chapter ${args.chapterId}.` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // ---------------------------------------------------------
  // EXAM TOOLS
  // ---------------------------------------------------------

  server.registerTool(
    "get_exams",
    {
      title: "Get Upcoming Exams",
      description: "Retrieves the list of upcoming exams and their full structured data (including exact chapter IDs). Use this to identify what syllabus is being tested next so you can prioritize incomplete chapters.",
      inputSchema: z.object({})
    },
    async () => {
      try {
        const [subSnap, chapSnap, examSnap] = await Promise.all([
          get(ref(db, "subjects")),
          get(ref(db, "chapters")),
          get(ref(db, "exams"))
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
              exams: parseNode(examSnap)
            }, null, 2) 
          }],
        };
      } catch (e: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${e.message}` }] };
      }
    }
  );

  server.registerTool(
    "upsert_exam",
    {
      title: "Upsert Exam",
      description: "Creates or updates an exam record. The syllabus MUST be built only by providing an array of EXISTING chapter IDs from the dashboard. Do not use free text. Call get_syllabus_state first to find the valid chapter IDs.",
      inputSchema: z.object({
        id: z.string().optional().describe("Provide to update an existing exam, omit to create a new one"),
        name: z.string().describe("The name of the exam (e.g., 'PST 1')"),
        date: z.string().describe("ISO date string for when the exam occurs"),
        location: z.enum(['School', 'Coaching']).describe("Where the exam takes place"),
        chapterIds: z.array(z.string()).describe("Array of EXISTING chapter IDs that form the syllabus of this exam")
      })
    },
    async (args: any) => {
      try {
        const now = new Date().toISOString();
        
        // Verify all chapter IDs actually exist
        const chapSnap = await get(ref(db, "chapters"));
        const allChapters = chapSnap.val() || {};
        const validChapterIds = Object.keys(allChapters);
        
        for (const cid of args.chapterIds) {
          if (!validChapterIds.includes(cid)) {
            throw new Error(`Invalid chapter ID provided: ${cid}. You must select only existing chapter IDs from the dashboard.`);
          }
        }

        if (args.id) {
          // Update
          const { id, ...updates } = args;
          await update(ref(db, `exams/${id}`), { ...updates, updatedAt: now });
          return { content: [{ type: "text", text: `Exam ${id} updated successfully.` }] };
        } else {
          // Create
          const newRef = await push(ref(db, "exams"), {
            name: args.name,
            date: args.date,
            location: args.location,
            chapterIds: args.chapterIds,
            createdAt: now,
            updatedAt: now,
          });
          return { content: [{ type: "text", text: `Exam created successfully with ID: ${newRef.key}` }] };
        }
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );


  server.registerTool(
    "delete_exam",
    {
      title: "Delete Exam",
      description: "Deletes an upcoming exam.",
      inputSchema: z.object({
        id: z.string().describe("The ID of the exam to delete")
      })
    },
    async (args: any) => {
      try {
        await remove(ref(db, `exams/${args.id}`));
        return { content: [{ type: "text", text: `Exam ${args.id} deleted successfully.` }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // ---------------------------------------------------------
  // MISTAKE LOG & WEAK TOPIC TOOLS
  // ---------------------------------------------------------

  server.registerTool(
    "manage_mistake_log",
    {
      title: "Manage Mistake Log",
      description: "Logs and manages weak topics and mistake entries for specific chapters. Allows adding mistakes (topics, question context, notes), retrieving weak/unresolved topics to target for revision, updating mistake status ('weak' vs 'resolved') or details, and deleting entries.",
      inputSchema: z.object({
        action: z.enum(['add', 'update', 'delete', 'get']).describe("The action to perform: 'add', 'update', 'delete', or 'get'"),
        id: z.string().optional().describe("ID of the mistake log entry (required for 'update' and 'delete')"),
        chapterId: z.string().optional().describe("ID of the chapter (required for 'add', optional filter for 'get')"),
        subjectId: z.string().optional().describe("ID of the subject (optional filter for 'get')"),
        topic: z.string().optional().describe("Specific concept or topic where the mistake occurred (required for 'add')"),
        question: z.string().optional().describe("Simple text entry of the question or problem context"),
        notes: z.string().optional().describe("Explanation of why the mistake happened, concept gap, or remedial note"),
        status: z.enum(['weak', 'resolved', 'all']).optional().describe("Status to set on 'add'/'update' ('weak' or 'resolved', defaults to 'weak'), or filter for 'get' ('weak', 'resolved', or 'all', defaults to 'weak')")
      })
    },
    async (args: any) => {
      try {
        const now = new Date().toISOString();

        if (args.action === 'add') {
          if (!args.chapterId) {
            return { content: [{ type: "text", text: "Error: 'chapterId' is required to add a mistake log entry." }], isError: true };
          }
          if (!args.topic || !args.topic.trim()) {
            return { content: [{ type: "text", text: "Error: 'topic' is required to identify the weak concept." }], isError: true };
          }

          const cSnap = await get(ref(db, `chapters/${args.chapterId}`));
          if (!cSnap.exists()) {
            return { content: [{ type: "text", text: `Error: Chapter with ID '${args.chapterId}' not found.` }], isError: true };
          }
          const chapter = cSnap.val();
          const subjectId = chapter.subjectId || "";

          const newRef = await push(ref(db, "mistakes"), {
            chapterId: args.chapterId,
            subjectId,
            topic: args.topic.trim(),
            question: args.question?.trim() || "",
            notes: args.notes?.trim() || "",
            status: args.status === 'resolved' ? 'resolved' : 'weak',
            createdAt: now,
            updatedAt: now,
          });

          return {
            content: [{
              type: "text",
              text: `Mistake log entry recorded successfully with ID: ${newRef.key} for chapter '${chapter.title}'. Topic: "${args.topic.trim()}". Status: ${args.status === 'resolved' ? 'resolved' : 'weak'}.`
            }]
          };
        }

        if (args.action === 'update') {
          if (!args.id) {
            return { content: [{ type: "text", text: "Error: 'id' is required to update a mistake log entry." }], isError: true };
          }

          const mSnap = await get(ref(db, `mistakes/${args.id}`));
          if (!mSnap.exists()) {
            return { content: [{ type: "text", text: `Error: Mistake log entry with ID '${args.id}' not found.` }], isError: true };
          }

          const updates: Record<string, any> = { updatedAt: now };
          if (args.topic !== undefined) updates.topic = args.topic.trim();
          if (args.question !== undefined) updates.question = args.question.trim();
          if (args.notes !== undefined) updates.notes = args.notes.trim();
          if (args.status !== undefined && args.status !== 'all') updates.status = args.status;

          await update(ref(db, `mistakes/${args.id}`), updates);
          return { content: [{ type: "text", text: `Mistake log entry '${args.id}' updated successfully.` }] };
        }

        if (args.action === 'delete') {
          if (!args.id) {
            return { content: [{ type: "text", text: "Error: 'id' is required to delete a mistake log entry." }], isError: true };
          }

          const mSnap = await get(ref(db, `mistakes/${args.id}`));
          if (!mSnap.exists()) {
            return { content: [{ type: "text", text: `Error: Mistake log entry with ID '${args.id}' not found.` }], isError: true };
          }

          await remove(ref(db, `mistakes/${args.id}`));
          return { content: [{ type: "text", text: `Mistake log entry '${args.id}' deleted successfully.` }] };
        }

        if (args.action === 'get') {
          const [mSnap, subSnap, chapSnap] = await Promise.all([
            get(ref(db, "mistakes")),
            get(ref(db, "subjects")),
            get(ref(db, "chapters"))
          ]);

          const rawMistakes = mSnap.val() || {};
          const subjects = subSnap.val() || {};
          const chapters = chapSnap.val() || {};

          const statusFilter = args.status || 'weak'; // default to 'weak' so agent gets weak topics

          const list = Object.keys(rawMistakes).map(key => {
            const m = rawMistakes[key];
            const chapter = chapters[m.chapterId];
            const subject = subjects[m.subjectId || (chapter ? chapter.subjectId : "")];

            return {
              id: key,
              ...m,
              chapterTitle: chapter ? chapter.title : "Unknown Chapter",
              subjectName: subject ? subject.name : "Unknown Subject"
            };
          }).filter(m => {
            if (args.chapterId && m.chapterId !== args.chapterId) return false;
            if (args.subjectId && m.subjectId !== args.subjectId) return false;
            if (statusFilter !== 'all' && m.status !== statusFilter) return false;
            return true;
          });

          const weakCount = list.filter(m => m.status === 'weak').length;

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                total: list.length,
                weakCount,
                filterApplied: {
                  chapterId: args.chapterId || null,
                  subjectId: args.subjectId || null,
                  status: statusFilter
                },
                mistakes: list
              }, null, 2)
            }]
          };
        }

        return { content: [{ type: "text", text: `Error: Unsupported action '${args.action}'. Supported actions are 'add', 'update', 'delete', 'get'.` }], isError: true };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // ---------------------------------------------------------
  // STUDY TIME TRACKING TOOLS
  // ---------------------------------------------------------

  server.registerTool(
    "log_task_time",
    {
      title: "Log Study Task Time",
      description: "Logs the time spent on a specific task within a chapter. Records subject, chapter, task, duration in minutes, optional date, optional start/end time window (e.g. 4:30 PM to 5:30 PM), timestamp, and optional notes. If start and end times are provided, duration is calculated automatically if omitted. Preserves historical records across repeated sessions without overwriting previous entries. Optionally marks the chapter task as completed.",
      inputSchema: z.object({
        chapterId: z.string().describe("The unique ID of the chapter being studied (call get_syllabus_state if not known)"),
        taskId: z.string().describe("The ID of the task (e.g. from the subject framework like 'm_concept', 't_lec', or 'revision' for chapter revision, or custom task ID)"),
        timeSpentMinutes: z.number().positive().optional().describe("Duration spent studying in minutes (e.g. 40). Optional if startTime and endTime are provided"),
        date: z.string().optional().describe("Session date in YYYY-MM-DD format (defaults to current date)"),
        startTime: z.string().optional().describe("Session start time e.g. '16:30' or '4:30 PM' (optional)"),
        endTime: z.string().optional().describe("Session end time e.g. '17:30' or '5:30 PM' (optional)"),
        subjectId: z.string().optional().describe("The unique ID of the subject (optional; automatically resolved from chapterId if omitted)"),
        taskName: z.string().optional().describe("Human-readable display name for this task (e.g. 'Standard Question Practice', 'NCERT Reading'). If omitted, will resolve from subject framework if available"),
        timestamp: z.string().optional().describe("ISO date string for when the session took place (defaults to current time)"),
        notes: z.string().optional().describe("Optional notes on what was accomplished during this study session"),
        markTaskCompleted: z.boolean().optional().describe("If true and the task exists in the subject framework, also marks the chapter task as completed")
      })
    },
    async (args: any) => {
      try {
        const now = new Date().toISOString();
        let minutes: number;

        if (typeof args.timeSpentMinutes === "number" && args.timeSpentMinutes > 0) {
          minutes = Math.round(args.timeSpentMinutes);
        } else if (args.startTime && args.endTime) {
          const derived = parseTimeRangeToMinutes(args.startTime, args.endTime);
          if (!derived || derived <= 0) {
            return { content: [{ type: "text", text: "Error: Could not calculate valid duration from provided startTime and endTime." }], isError: true };
          }
          minutes = derived;
        } else {
          return { content: [{ type: "text", text: "Error: Either 'timeSpentMinutes' or both 'startTime' and 'endTime' must be provided." }], isError: true };
        }

        let sessionTime = args.timestamp;
        if (!sessionTime) {
          if (args.date) {
            const timePart = args.startTime && args.startTime.match(/^\d{1,2}:\d{2}$/) ? `${args.startTime}:00` : "12:00:00";
            sessionTime = `${args.date}T${timePart}.000Z`;
          } else {
            sessionTime = now;
          }
        }

        // 1. Verify chapter exists
        const cSnap = await get(ref(db, `chapters/${args.chapterId}`));
        if (!cSnap.exists()) {
          return { content: [{ type: "text", text: `Error: Chapter with ID '${args.chapterId}' not found.` }], isError: true };
        }
        const chapter = cSnap.val();
        const subjectId = args.subjectId || chapter.subjectId || "";

        // 2. Fetch subject to resolve task name and check framework
        let subjectName = "Unknown Subject";
        let resolvedTaskName = args.taskName?.trim();

        if (subjectId) {
          const sSnap = await get(ref(db, `subjects/${subjectId}`));
          if (sSnap.exists()) {
            const subject = sSnap.val();
            subjectName = subject.name || subjectName;

            // Try to find task name in subject framework
            if (!resolvedTaskName && subject.tasks && Array.isArray(subject.tasks)) {
              const matchedTask = subject.tasks.find((t: any) => t.id === args.taskId);
              if (matchedTask) {
                resolvedTaskName = matchedTask.name;
              }
            }
          }
        }

        if (!resolvedTaskName) {
          if (args.taskId === 'revision') {
            resolvedTaskName = 'Chapter Revision';
          } else {
            resolvedTaskName = args.taskId;
          }
        }

        // 3. If markTaskCompleted is true, mark chapter task as completed
        let taskCompletedMsg = "";
        if (args.markTaskCompleted) {
          const updatePath = `chapters/${args.chapterId}/tasks/${args.taskId}`;
          await update(ref(db), {
            [`${updatePath}/status`]: 'completed',
            [`${updatePath}/completedAt`]: sessionTime,
            [`chapters/${args.chapterId}/updatedAt`]: now
          });
          taskCompletedMsg = ` and marked task '${resolvedTaskName}' as completed`;
        }

        // 4. Push new immutable time log record
        const logPayload: Record<string, any> = {
          chapterId: args.chapterId,
          subjectId,
          taskId: args.taskId,
          taskName: resolvedTaskName,
          timeSpentMinutes: minutes,
          timestamp: sessionTime,
          notes: args.notes?.trim() || "",
          createdAt: now,
          updatedAt: now
        };

        if (args.date) logPayload.sessionDate = args.date;
        if (args.startTime) logPayload.startTime = args.startTime;
        if (args.endTime) logPayload.endTime = args.endTime;

        const newRef = await push(ref(db, "timeLogs"), logPayload);

        // 5. Query chapter totals to give immediate useful feedback
        const timeLogsSnap = await get(ref(db, "timeLogs"));
        const allLogs = timeLogsSnap.val() || {};
        const chapterLogs = Object.values(allLogs).filter((l: any) => l.chapterId === args.chapterId);
        const taskLogs = chapterLogs.filter((l: any) => l.taskId === args.taskId);

        const chapterTotalMinutes = chapterLogs.reduce((sum: number, l: any) => sum + (l.timeSpentMinutes || 0), 0);
        const taskTotalMinutes = taskLogs.reduce((sum: number, l: any) => sum + (l.timeSpentMinutes || 0), 0);

        const intervalStr = formatTimeRangeDisplay(args.startTime, args.endTime);
        const intervalMsg = intervalStr ? ` (${intervalStr})` : "";
        const dateMsg = args.date ? ` on ${args.date}` : "";

        return {
          content: [{
            type: "text",
            text: `Successfully logged ${minutes} minutes${intervalMsg}${dateMsg} for '${resolvedTaskName}' on chapter '${chapter.title}' (${subjectName})${taskCompletedMsg}.\nLog ID: ${newRef.key}\nTotal on this task: ${taskTotalMinutes}m across ${taskLogs.length} session(s).\nTotal on chapter: ${chapterTotalMinutes}m across ${chapterLogs.length} session(s).`
          }]
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "get_study_time_analytics",
    {
      title: "Get Study Time Analytics",
      description: "Calculates study time statistics from logged data. Returns total time spent, average time per session, empirical average time required to complete or revise each task type across multiple sessions, time-consuming chapter rankings, and recent session logs. Use this to construct realistic study schedules based on actual student performance.",
      inputSchema: z.object({
        subjectId: z.string().optional().describe("Optional filter by subject ID"),
        chapterId: z.string().optional().describe("Optional filter by chapter ID"),
        taskId: z.string().optional().describe("Optional filter by task ID or task type (e.g. 'revision')")
      })
    },
    async (args: any) => {
      try {
        const [timeSnap, subSnap, chapSnap] = await Promise.all([
          get(ref(db, "timeLogs")),
          get(ref(db, "subjects")),
          get(ref(db, "chapters"))
        ]);

        const rawTimeLogs = timeSnap.val() || {};
        const rawSubjects = subSnap.val() || {};
        const rawChapters = chapSnap.val() || {};

        let logs = Object.keys(rawTimeLogs).map(k => ({
          id: k,
          ...rawTimeLogs[k]
        }));

        // Apply filters if provided
        if (args.subjectId) logs = logs.filter(l => l.subjectId === args.subjectId);
        if (args.chapterId) logs = logs.filter(l => l.chapterId === args.chapterId);
        if (args.taskId) logs = logs.filter(l => l.taskId === args.taskId);

        // Sort descending by timestamp
        logs.sort((a, b) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime());

        // 1. Overall Summary
        const totalMinutes = logs.reduce((sum, l) => sum + (l.timeSpentMinutes || 0), 0);
        const sessionCount = logs.length;
        const averageSessionMinutes = sessionCount > 0 ? Math.round(totalMinutes / sessionCount) : 0;

        const formatDur = (mins: number) => {
          if (!mins || mins <= 0) return "0m";
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          if (h === 0) return `${m}m`;
          if (m === 0) return `${h}h`;
          return `${h}h ${m}m`;
        };

        // 2. Periodic Summary (Today, This Week, This Month, Trends)
        const periodicStats = calculatePeriodicStudyStats(logs as any);

        // 3. Task Type Empirical Benchmarks (across multiple sessions)
        const taskGroups: Record<string, {
          taskId: string;
          taskName: string;
          durations: number[];
          sampleChapters: Set<string>;
        }> = {};

        for (const log of logs) {
          const key = log.taskName || log.taskId || "General Study";
          if (!taskGroups[key]) {
            taskGroups[key] = {
              taskId: log.taskId,
              taskName: log.taskName || log.taskId,
              durations: [],
              sampleChapters: new Set()
            };
          }
          taskGroups[key].durations.push(log.timeSpentMinutes || 0);
          const chap = rawChapters[log.chapterId];
          if (chap) taskGroups[key].sampleChapters.add(chap.title);
        }

        const taskBenchmarks = Object.values(taskGroups).map(g => {
          const totalTaskMins = g.durations.reduce((sum, d) => sum + d, 0);
          const count = g.durations.length;
          const avgMins = count > 0 ? Math.round(totalTaskMins / count) : 0;
          return {
            taskId: g.taskId,
            taskName: g.taskName,
            totalMinutes: totalTaskMins,
            totalFormatted: formatDur(totalTaskMins),
            sessionCount: count,
            averageMinutesPerSession: avgMins,
            averageFormatted: formatDur(avgMins),
            minMinutes: count > 0 ? Math.min(...g.durations) : 0,
            maxMinutes: count > 0 ? Math.max(...g.durations) : 0,
            sampleChapters: Array.from(g.sampleChapters).slice(0, 5)
          };
        }).sort((a, b) => b.totalMinutes - a.totalMinutes);

        // 3. Chapter Breakdown & Time Sinks
        const chapterGroups: Record<string, {
          chapterId: string;
          chapterTitle: string;
          subjectName: string;
          totalMinutes: number;
          sessionCount: number;
          taskBreakdown: Record<string, number>;
        }> = {};

        for (const log of logs) {
          if (!chapterGroups[log.chapterId]) {
            const chap = rawChapters[log.chapterId];
            const sub = rawSubjects[log.subjectId || (chap ? chap.subjectId : "")];
            chapterGroups[log.chapterId] = {
              chapterId: log.chapterId,
              chapterTitle: chap ? chap.title : "Unknown Chapter",
              subjectName: sub ? sub.name : "Unknown Subject",
              totalMinutes: 0,
              sessionCount: 0,
              taskBreakdown: {}
            };
          }
          const c = chapterGroups[log.chapterId];
          c.totalMinutes += log.timeSpentMinutes || 0;
          c.sessionCount += 1;
          const tName = log.taskName || log.taskId;
          c.taskBreakdown[tName] = (c.taskBreakdown[tName] || 0) + (log.timeSpentMinutes || 0);
        }

        const chapterStats = Object.values(chapterGroups)
          .map(c => ({
            ...c,
            totalFormatted: formatDur(c.totalMinutes),
            averagePerSession: Math.round(c.totalMinutes / c.sessionCount)
          }))
          .sort((a, b) => b.totalMinutes - a.totalMinutes);

        // 4. Subject Breakdown
        const subjectGroups: Record<string, { subjectId: string; subjectName: string; totalMinutes: number; sessionCount: number }> = {};
        for (const log of logs) {
          const sId = log.subjectId || (rawChapters[log.chapterId]?.subjectId) || "unknown";
          if (!subjectGroups[sId]) {
            const sub = rawSubjects[sId];
            subjectGroups[sId] = {
              subjectId: sId,
              subjectName: sub ? sub.name : "Unknown Subject",
              totalMinutes: 0,
              sessionCount: 0
            };
          }
          subjectGroups[sId].totalMinutes += log.timeSpentMinutes || 0;
          subjectGroups[sId].sessionCount += 1;
        }

        const subjectStats = Object.values(subjectGroups)
          .map(s => ({
            ...s,
            totalFormatted: formatDur(s.totalMinutes)
          }))
          .sort((a, b) => b.totalMinutes - a.totalMinutes);

        // 5. Recent Sessions (last 15)
        const recentSessions = logs.slice(0, 15).map(l => {
          const chap = rawChapters[l.chapterId];
          const sub = rawSubjects[l.subjectId || (chap ? chap.subjectId : "")];
          return {
            id: l.id,
            timestamp: l.timestamp,
            sessionDate: l.sessionDate || null,
            startTime: l.startTime || null,
            endTime: l.endTime || null,
            timeRange: formatTimeRangeDisplay(l.startTime, l.endTime),
            duration: formatDur(l.timeSpentMinutes),
            minutes: l.timeSpentMinutes,
            chapterTitle: chap ? chap.title : "Unknown Chapter",
            subjectName: sub ? sub.name : "Unknown Subject",
            taskName: l.taskName || l.taskId,
            notes: l.notes || ""
          };
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              summary: {
                totalMinutes,
                totalTimeFormatted: formatDur(totalMinutes),
                totalSessions: sessionCount,
                averageSessionMinutes,
                averageSessionFormatted: formatDur(averageSessionMinutes),
                filterApplied: {
                  subjectId: args.subjectId || null,
                  chapterId: args.chapterId || null,
                  taskId: args.taskId || null
                }
              },
              periodicSummary: {
                today: {
                  minutes: periodicStats.todayMinutes,
                  formatted: formatDur(periodicStats.todayMinutes)
                },
                thisWeek: {
                  minutes: periodicStats.thisWeekMinutes,
                  formatted: formatDur(periodicStats.thisWeekMinutes)
                },
                thisMonth: {
                  minutes: periodicStats.thisMonthMinutes,
                  formatted: formatDur(periodicStats.thisMonthMinutes)
                },
                dailyAverage: {
                  minutes: periodicStats.dailyAverageMinutes,
                  formatted: formatDur(periodicStats.dailyAverageMinutes)
                },
                weeklyAverage: {
                  minutes: periodicStats.weeklyAverageMinutes,
                  formatted: formatDur(periodicStats.weeklyAverageMinutes)
                },
                dailyTrend: periodicStats.dailyTrend,
                weeklyTrend: periodicStats.weeklyTrend,
                monthlyTrend: periodicStats.monthlyTrend
              },
              taskTypeBenchmarks: taskBenchmarks,
              chapterRankings: chapterStats,
              subjectBreakdown: subjectStats,
              recentSessions
            }, null, 2)
          }]
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "manage_time_logs",
    {
      title: "Manage Study Time Logs",
      description: "Lists or deletes individual study time records. Allows cleaning up erroneous entries or test logs.",
      inputSchema: z.object({
        action: z.enum(['list', 'delete']).describe("The action to perform: 'list' or 'delete'"),
        id: z.string().optional().describe("ID of the time log entry to delete (required for 'delete')"),
        limit: z.number().optional().describe("Maximum number of entries to return on 'list' (defaults to 30)")
      })
    },
    async (args: any) => {
      try {
        if (args.action === 'delete') {
          if (!args.id) {
            return { content: [{ type: "text", text: "Error: 'id' is required to delete a time log entry." }], isError: true };
          }
          const tSnap = await get(ref(db, `timeLogs/${args.id}`));
          if (!tSnap.exists()) {
            return { content: [{ type: "text", text: `Error: Time log entry with ID '${args.id}' not found.` }], isError: true };
          }
          await remove(ref(db, `timeLogs/${args.id}`));
          return { content: [{ type: "text", text: `Time log entry '${args.id}' deleted successfully.` }] };
        }

        if (args.action === 'list') {
          const tSnap = await get(ref(db, "timeLogs"));
          const raw = tSnap.val() || {};
          const list = Object.keys(raw).map(k => ({ id: k, ...raw[k] }));
          list.sort((a, b) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime());
          const max = args.limit || 30;
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                total: list.length,
                logs: list.slice(0, max)
              }, null, 2)
            }]
          };
        }

        return { content: [{ type: "text", text: `Error: Unsupported action '${args.action}'. Supported actions are 'list' and 'delete'.` }], isError: true };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

};


