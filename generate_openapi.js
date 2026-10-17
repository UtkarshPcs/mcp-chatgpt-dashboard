const fs = require('fs');

const mcpOutput = {
  "tools": [
    {
      "name": "get_syllabus_state",
      "description": "Retrieves the full syllabus hierarchy (Subjects and Chapters) along with their IDs. Always call this tool first if you need to update or delete a subject or chapter but don't know its ID.",
      "inputSchema": { "type": "object", "properties": {} }
    },
    {
      "name": "upsert_subject",
      "description": "Creates a new subject or updates an existing one. To update, provide the existing 'id' (call get_syllabus_state if you don't know it). To create a new subject, leave 'id' empty.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "description": "Provide to update existing, omit to create new" },
          "name": { "type": "string", "description": "Name of the subject" },
          "section": { "type": "string", "description": "Parent section" },
          "color": { "type": "string", "description": "Theme color" }
        },
        "required": ["name"]
      }
    },
    {
      "name": "delete_subject",
      "description": "Deletes a subject. If you do not know the subject ID, call get_syllabus_state first to find it.",
      "inputSchema": { "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }
    },
    {
      "name": "upsert_chapters",
      "description": "Creates or updates multiple chapters at once. Pass an array of chapter objects. For each object: to update, provide the existing 'id'. To create a new chapter, leave 'id' empty but you MUST provide 'subjectId' and 'title'.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "chapters": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": { "type": "string" },
                "subjectId": { "type": "string" },
                "title": { "type": "string" },
                "progress": { "type": "number" },
                "status": { "type": "string" },
                "priority": { "type": "string" },
                "estimatedTime": { "type": "string" },
                "targetDate": { "type": "string" },
                "notes": { "type": "string" },
                "lastRevisionDate": { "type": "string" },
                "nextRevisionDate": { "type": "string" },
                "revisionCount": { "type": "number" }
              }
            }
          }
        },
        "required": ["chapters"]
      }
    },
    {
      "name": "bulk_import_syllabus",
      "description": "Creates multiple subjects and their nested chapters in a single operation. Provide 'jsonData' as a raw JSON string.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "jsonData": { "type": "string", "description": "A JSON string containing the subjects array." }
        },
        "required": ["jsonData"]
      }
    },
    {
      "name": "delete_chapter",
      "description": "Deletes a chapter. If you do not know the chapter ID, call get_syllabus_state first to find it.",
      "inputSchema": { "type": "object", "properties": { "id": { "type": "string" } }, "required": ["id"] }
    },
    {
      "name": "update_ai_recommendation",
      "description": "Updates the central AI Study Recommendation card. You MUST provide the correct chapterId and subjectId. If you do not know them, call get_syllabus_state first.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "chapterId": { "type": "string" },
          "subjectId": { "type": "string" },
          "reason": { "type": "string" },
          "estimatedTime": { "type": "string" },
          "priority": { "type": "string" }
        },
        "required": ["chapterId", "subjectId", "reason", "estimatedTime", "priority"]
      }
    },
    {
      "name": "record_chapter_revision",
      "description": "Updates a chapter's revision dates. ALWAYS use this tool when the user completes a revision, rather than updating notes. You MUST calculate the nextRevisionDate based on spaced repetition (e.g., 1st revision = +1 day, 2nd = +3 days, 3rd = +7 days).",
      "inputSchema": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "lastRevisionDate": { "type": "string" },
          "nextRevisionDate": { "type": "string" }
        },
        "required": ["id", "lastRevisionDate", "nextRevisionDate"]
      }
    },
    {
      "name": "get_delayed_revisions",
      "description": "Retrieves all chapters that have a scheduled revision date that has already passed.",
      "inputSchema": { "type": "object", "properties": {} }
    },
    {
      "name": "mark_revision_complete",
      "description": "Marks a chapter's pending revision as completed. It increments the revision count (max 3), updates lastRevisionDate to today, and clears nextRevisionDate.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "id": { "type": "string" }
        },
        "required": ["id"]
      }
    },
    {
      "name": "manage_subject_template",
      "description": "Creates, updates, or reorders the task framework for a specific subject. Overwrites the existing template. Provide an array of tasks with names, weights (must sum to 100), and order.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "subjectId": { "type": "string", "description": "The unique ID of the subject to manage (e.g., 'physics_12')" },
          "tasks": {
            "type": "array",
            "description": "The complete array of tasks that make up the framework for this subject",
            "items": {
              "type": "object",
              "properties": {
                "id": { "type": "string", "description": "A unique string ID for the task (e.g., 'physics_lecture')" },
                "name": { "type": "string", "description": "Display name (e.g., 'Watch Lecture')" },
                "weight": { "type": "number", "description": "Percentage weight of this task (0-100)" },
                "order": { "type": "number", "description": "Sorting order" }
              },
              "required": ["id", "name", "weight", "order"]
            }
          }
        },
        "required": ["subjectId", "tasks"]
      }
    },
    {
      "name": "update_chapter_task",
      "description": "Marks a specific task as completed or not_started for a particular chapter.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "chapterId": { "type": "string", "description": "The unique ID of the chapter to update" },
          "taskId": { "type": "string", "description": "The ID of the task from the subject's task template" },
          "status": { "type": "string", "enum": ["completed", "not_started"], "description": "The new completion status ('completed' or 'not_started')" }
        },
        "required": ["chapterId", "taskId", "status"]
      }
    },
    {
      "name": "get_exams",
      "description": "Retrieves the list of upcoming exams and their full structured data.",
      "inputSchema": { "type": "object", "properties": {} }
    },
    {
      "name": "upsert_exam",
      "description": "Creates or updates an exam record with chapter IDs.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "date": { "type": "string" },
          "location": { "type": "string", "enum": ["School", "Coaching"] },
          "chapterIds": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["name", "date", "location", "chapterIds"]
      }
    },
    {
      "name": "delete_exam",
      "description": "Deletes an upcoming exam.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "id": { "type": "string" }
        },
        "required": ["id"]
      }
    },
    {
      "name": "manage_mistake_log",
      "description": "Logs and manages weak topics and mistake entries for specific chapters. Allows adding mistakes (topics, question context, notes), retrieving weak/unresolved topics to target for revision, updating mistake status ('weak' vs 'resolved') or details, and deleting entries.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "action": { "type": "string", "enum": ["add", "update", "delete", "get"], "description": "The action to perform: 'add', 'update', 'delete', or 'get'" },
          "id": { "type": "string", "description": "ID of the mistake log entry (required for 'update' and 'delete')" },
          "chapterId": { "type": "string", "description": "ID of the chapter (required for 'add', optional filter for 'get')" },
          "subjectId": { "type": "string", "description": "ID of the subject (optional filter for 'get')" },
          "topic": { "type": "string", "description": "Specific concept or topic where the mistake occurred (required for 'add')" },
          "question": { "type": "string", "description": "Simple text entry of the question or problem context" },
          "notes": { "type": "string", "description": "Explanation of why the mistake happened, concept gap, or remedial note" },
          "status": { "type": "string", "enum": ["weak", "resolved", "all"], "description": "Status to set on 'add'/'update' ('weak' or 'resolved', defaults to 'weak'), or filter for 'get' ('weak', 'resolved', or 'all', defaults to 'weak')" }
        },
        "required": ["action"]
      }
    }
  ]
};

const openapi = {
  openapi: "3.1.0",
  info: { title: "Academics Manager MCP Server", version: "1.0.0" },
  servers: [{ url: "https://academics-dashboard.vercel.app" }],
  paths: {}
};

mcpOutput.tools.forEach(tool => {
  openapi.paths[`/api/mcp/tools/${tool.name}`] = {
    post: {
      operationId: tool.name,
      summary: tool.title || tool.name,
      description: tool.description,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: tool.inputSchema
          }
        }
      },
      responses: {
        "200": {
          description: "Success",
          content: { "application/json": { schema: { type: "object" } } }
        }
      }
    }
  };
});

fs.writeFileSync('openapi.json', JSON.stringify(openapi, null, 2));
console.log("Done");
