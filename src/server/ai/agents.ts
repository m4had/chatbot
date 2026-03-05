import { generateResponse } from "./router";
import { searchDocuments } from "./rag";
import type { AgentTask } from "../types";
import { v4 as uuid } from "uuid";

const AGENT_PROMPTS: Record<string, string> = {
  researcher: `You are a Research Agent. Your job is to:
- Analyze the query thoroughly
- Identify key facts and data points
- Provide well-sourced, accurate information
- Flag any uncertainties or areas needing verification
Format your findings as structured notes with clear citations.`,

  editor: `You are an Editor Agent. Your job is to:
- Review and refine the given text for clarity, grammar, and style
- Ensure consistency in tone and formatting
- Suggest improvements without changing the core meaning
- Fix any factual inconsistencies you notice
Return the polished version with notes on changes made.`,

  coder: `You are a Coding Agent. Your job is to:
- Write clean, well-documented code
- Follow best practices and design patterns
- Include error handling and edge cases
- Provide explanations for complex logic
Return complete, runnable code with inline comments.`,

  analyst: `You are an Analyst Agent. Your job is to:
- Break down complex data or situations
- Identify patterns, trends, and insights
- Provide actionable recommendations
- Support conclusions with evidence
Return a structured analysis with key findings and recommendations.`,
};

export async function runAgent(
  type: "researcher" | "editor" | "coder" | "analyst",
  prompt: string,
  context?: string
): Promise<AgentTask> {
  const task: AgentTask = {
    id: uuid(),
    type,
    prompt,
    status: "running",
  };

  try {
    const systemPrompt = AGENT_PROMPTS[type] + (context ? `\n\nAdditional context:\n${context}` : "");

    const result = await generateResponse(
      [{ role: "user", content: prompt }],
      { system: systemPrompt, temperature: 0.3 }
    );

    task.status = "completed";
    task.result = result.text;
  } catch (error) {
    task.status = "failed";
    task.result = `Agent error: ${error instanceof Error ? error.message : "Unknown error"}`;
  }

  return task;
}

export async function orchestrateAgents(
  userQuery: string,
  agentTypes: Array<"researcher" | "editor" | "coder" | "analyst">
): Promise<AgentTask[]> {
  // Get RAG context if available
  const ragResults = searchDocuments(userQuery, 3);
  const ragContext = ragResults.map((r) => r.chunk.content).join("\n\n");

  // Run agents in parallel
  const tasks = await Promise.all(
    agentTypes.map((type) => runAgent(type, userQuery, ragContext))
  );

  return tasks;
}

export async function planAndExecute(goal: string): Promise<{
  plan: string[];
  results: AgentTask[];
}> {
  // Step 1: Have the analyst decompose the goal into steps
  const planResult = await generateResponse(
    [
      {
        role: "user",
        content: `Decompose this goal into 3-5 concrete sub-tasks. Return ONLY a JSON array of strings, no other text.\n\nGoal: ${goal}`,
      },
    ],
    { temperature: 0.2 }
  );

  let plan: string[];
  try {
    plan = JSON.parse(planResult.text);
  } catch {
    plan = [goal];
  }

  // Step 2: Execute each step with the appropriate agent
  const results: AgentTask[] = [];
  let previousContext = "";

  for (const step of plan) {
    // Determine best agent for this step
    const agentType = step.toLowerCase().includes("research") || step.toLowerCase().includes("find")
      ? "researcher"
      : step.toLowerCase().includes("write") || step.toLowerCase().includes("code")
      ? "coder"
      : step.toLowerCase().includes("review") || step.toLowerCase().includes("edit")
      ? "editor"
      : "analyst";

    const task = await runAgent(
      agentType as AgentTask["type"],
      step,
      previousContext
    );
    results.push(task);

    if (task.result) {
      previousContext += `\n\nPrevious step result (${step}):\n${task.result}`;
    }
  }

  return { plan, results };
}
