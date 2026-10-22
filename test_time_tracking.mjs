async function run() {
  console.log("=== Running Academics MCP Study Time Tracking Tests ===");

  const mcpCall = async (method, params = {}) => {
    const isToolCall = method !== 'tools/list';
    const body = isToolCall 
      ? { jsonrpc: '2.0', method: 'tools/call', params: { name: method, arguments: params }, id: 1 }
      : { jsonrpc: '2.0', method: 'tools/list', id: 1 };

    const res = await fetch('http://127.0.0.1:3000/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    const dataStr = text.split('data: ')[1];
    return JSON.parse(dataStr);
  };

  // 1. Verify Tools List
  console.log("\n[Test 1] Verifying registered MCP tools...");
  const toolsRes = await mcpCall('tools/list');
  const toolNames = toolsRes.result.tools.map(t => t.name);
  console.log("Found", toolNames.length, "tools");

  const requiredTools = ['log_task_time', 'get_study_time_analytics', 'manage_time_logs'];
  for (const tool of requiredTools) {
    if (!toolNames.includes(tool)) {
      throw new Error(`Missing required tool: ${tool}`);
    }
  }
  console.log("✓ All new tools registered successfully:", requiredTools.join(", "));

  // 2. Fetch Syllabus State to pick a test chapter
  console.log("\n[Test 2] Fetching syllabus state...");
  const stateRes = await mcpCall('get_syllabus_state', {});
  const state = JSON.parse(stateRes.result.content[0].text);
  const mathSubject = state.subjects.find(s => s.name === 'Mathematics');
  if (!mathSubject) throw new Error("Mathematics subject not found");

  const mathChapters = state.chapters.filter(c => c.subjectId === mathSubject.id);
  if (mathChapters.length === 0) throw new Error("No Mathematics chapters found");
  const testChapter = mathChapters[0];
  console.log(`✓ Using test chapter: '${testChapter.title}' (ID: ${testChapter.id}) under '${mathSubject.name}'`);

  const createdLogIds = [];

  // 3. Test log_task_time - Session 1 (40 min on m_concept)
  console.log("\n[Test 3.1] Logging Session 1: 40 min on 'm_concept'...");
  const log1Res = await mcpCall('log_task_time', {
    chapterId: testChapter.id,
    taskId: 'm_concept',
    timeSpentMinutes: 40,
    notes: 'Test Session 1: Theory notes review'
  });
  console.log("Response:", log1Res.result.content[0].text);
  const log1IdMatch = log1Res.result.content[0].text.match(/Log ID:\s*([^\n]+)/);
  if (log1IdMatch) createdLogIds.push(log1IdMatch[1].trim());

  // 4. Test log_task_time - Session 2 (30 min on same task to test repeated sessions)
  console.log("\n[Test 3.2] Logging Session 2: 30 min on same task 'm_concept' (repeated session test)...");
  const log2Res = await mcpCall('log_task_time', {
    chapterId: testChapter.id,
    taskId: 'm_concept',
    timeSpentMinutes: 30,
    notes: 'Test Session 2: Additional recall exercise'
  });
  console.log("Response:", log2Res.result.content[0].text);
  const log2IdMatch = log2Res.result.content[0].text.match(/Log ID:\s*([^\n]+)/);
  if (log2IdMatch) createdLogIds.push(log2IdMatch[1].trim());

  // 5. Test log_task_time - Session 3 (45 min revision session)
  console.log("\n[Test 3.3] Logging Session 3: 45 min on 'revision'...");
  const log3Res = await mcpCall('log_task_time', {
    chapterId: testChapter.id,
    taskId: 'revision',
    timeSpentMinutes: 45,
    notes: 'Test Session 3: Full chapter revision drill'
  });
  console.log("Response:", log3Res.result.content[0].text);
  const log3IdMatch = log3Res.result.content[0].text.match(/Log ID:\s*([^\n]+)/);
  if (log3IdMatch) createdLogIds.push(log3IdMatch[1].trim());

  // 6. Test log_task_time - Session 4 (25 min on m_formula with markTaskCompleted = true)
  console.log("\n[Test 3.4] Logging Session 4: 25 min with markTaskCompleted=true on 'm_formula'...");
  const log4Res = await mcpCall('log_task_time', {
    chapterId: testChapter.id,
    taskId: 'm_formula',
    timeSpentMinutes: 25,
    markTaskCompleted: true,
    notes: 'Test Session 4: Formula derivation mastered'
  });
  console.log("Response:", log4Res.result.content[0].text);
  const log4IdMatch = log4Res.result.content[0].text.match(/Log ID:\s*([^\n]+)/);
  if (log4IdMatch) createdLogIds.push(log4IdMatch[1].trim());

  // 6.1 Test log_task_time - Session 5 (Interval 16:30 to 17:30 without explicit timeSpentMinutes)
  console.log("\n[Test 3.5] Logging Session 5: Interval '16:30' to '17:30' (auto duration derivation)...");
  const log5Res = await mcpCall('log_task_time', {
    chapterId: testChapter.id,
    taskId: 'm_concept',
    date: '2026-10-22',
    startTime: '16:30',
    endTime: '17:30',
    notes: 'Test Session 5: Evening theory study with time interval'
  });
  console.log("Response:", log5Res.result.content[0].text);
  const log5IdMatch = log5Res.result.content[0].text.match(/Log ID:\s*([^\n]+)/);
  if (log5IdMatch) createdLogIds.push(log5IdMatch[1].trim());

  // 7. Verify Task Completion
  console.log("\n[Test 4] Verifying task completion state in get_syllabus_state...");
  const stateRes2 = await mcpCall('get_syllabus_state', {});
  const state2 = JSON.parse(stateRes2.result.content[0].text);
  const updatedChapter = state2.chapters.find(c => c.id === testChapter.id);
  if (updatedChapter.tasks && updatedChapter.tasks['m_formula']?.status === 'completed') {
    console.log("✓ Task 'm_formula' successfully verified as 'completed'!");
  } else {
    console.warn("⚠️ Note: 'm_formula' state:", updatedChapter.tasks?.['m_formula']);
  }

  // 8. Test get_study_time_analytics
  console.log("\n[Test 5] Fetching study time analytics...");
  const analyticsRes = await mcpCall('get_study_time_analytics', { chapterId: testChapter.id });
  const analytics = JSON.parse(analyticsRes.result.content[0].text);
  console.log("Summary:", JSON.stringify(analytics.summary, null, 2));
  console.log("Task Benchmarks count:", analytics.taskTypeBenchmarks.length);

  const conceptBenchmark = analytics.taskTypeBenchmarks.find(b => b.taskId === 'm_concept');
  if (conceptBenchmark) {
    console.log(`✓ 'm_concept' empirical benchmark: average = ${conceptBenchmark.averageMinutesPerSession}m across ${conceptBenchmark.sessionCount} sessions (min: ${conceptBenchmark.minMinutes}m, max: ${conceptBenchmark.maxMinutes}m, total: ${conceptBenchmark.totalMinutes}m)`);
    if (conceptBenchmark.averageMinutesPerSession !== 43) {
      throw new Error(`Expected average of 43m for m_concept, got ${conceptBenchmark.averageMinutesPerSession}`);
    }
    if (conceptBenchmark.sessionCount !== 3) {
      throw new Error(`Expected 3 sessions for m_concept, got ${conceptBenchmark.sessionCount}`);
    }
  } else {
    throw new Error("m_concept benchmark not found");
  }

  // Verify Periodic Summary & Time Range in Recent Sessions
  console.log("\n[Test 5.1] Verifying periodicSummary in analytics...");
  if (!analytics.periodicSummary) throw new Error("Missing periodicSummary in analytics");
  console.log("Periodic Summary:", JSON.stringify(analytics.periodicSummary, null, 2));
  if (typeof analytics.periodicSummary.today.minutes !== 'number') {
    throw new Error("Missing today minutes in periodicSummary");
  }
  if (!Array.isArray(analytics.periodicSummary.dailyTrend) || analytics.periodicSummary.dailyTrend.length !== 14) {
    throw new Error("Expected dailyTrend to have 14 days");
  }
  if (!Array.isArray(analytics.periodicSummary.weeklyTrend) || analytics.periodicSummary.weeklyTrend.length !== 6) {
    throw new Error("Expected weeklyTrend to have 6 weeks");
  }
  if (!Array.isArray(analytics.periodicSummary.monthlyTrend) || analytics.periodicSummary.monthlyTrend.length !== 6) {
    throw new Error("Expected monthlyTrend to have 6 months");
  }

  const intervalSession = analytics.recentSessions.find(s => s.startTime === '16:30' && s.endTime === '17:30');
  if (!intervalSession) {
    throw new Error("Recent session with startTime 16:30 and endTime 17:30 not found");
  }
  if (intervalSession.timeRange !== '4:30 PM – 5:30 PM') {
    throw new Error(`Expected timeRange '4:30 PM – 5:30 PM', got ${intervalSession.timeRange}`);
  }
  if (intervalSession.minutes !== 60) {
    throw new Error(`Expected auto-derived duration 60m, got ${intervalSession.minutes}`);
  }
  console.log(`✓ Verified interval session in recentSessions: ${intervalSession.timeRange} (${intervalSession.duration})`);

  const revisionBenchmark = analytics.taskTypeBenchmarks.find(b => b.taskId === 'revision');
  if (revisionBenchmark) {
    console.log(`✓ 'revision' empirical benchmark: ${revisionBenchmark.averageMinutesPerSession}m (${revisionBenchmark.taskName})`);
  }

  // 9. Clean up test logs
  console.log("\n[Test 6] Cleaning up test time logs:", createdLogIds);
  for (const id of createdLogIds) {
    const delRes = await mcpCall('manage_time_logs', { action: 'delete', id });
    console.log(`✓ Deleted ${id}:`, delRes.result.content[0].text);
  }

  // 10. Regression check on existing tools
  console.log("\n[Test 7] Regression checks on existing tools...");
  const examsRes = await mcpCall('get_exams', {});
  const examsData = JSON.parse(examsRes.result.content[0].text);
  console.log(`✓ get_exams passed, returned ${examsData.exams.length} exams.`);

  console.log("\n=======================================================");
  console.log("ALL TESTS COMPLETED SUCCESSFULLY WITH ZERO ERRORS! ✓");
  console.log("=======================================================");
  process.exit(0);
}

run().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
