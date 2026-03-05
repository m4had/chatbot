import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, generateText, LanguageModel } from "ai";

interface ModelProvider {
  name: string;
  available: boolean;
  createModel: (modelId: string) => LanguageModel;
  defaultModel: string;
}

function getProviders(): ModelProvider[] {
  const providers: ModelProvider[] = [];

  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    providers.push({
      name: "openai",
      available: true,
      createModel: (id) => openai(id),
      defaultModel: "gpt-4o",
    });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    providers.push({
      name: "anthropic",
      available: true,
      createModel: (id) => anthropic(id),
      defaultModel: "claude-sonnet-4-20250514",
    });
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
    providers.push({
      name: "google",
      available: true,
      createModel: (id) => google(id),
      defaultModel: "gemini-1.5-pro",
    });
  }

  return providers;
}

function parseModelSpec(spec?: string): { provider: string; model: string } | null {
  if (!spec) return null;
  const parts = spec.split("/");
  if (parts.length === 2) return { provider: parts[0], model: parts[1] };
  return null;
}

export function getModel(preferDeepReasoning = false): LanguageModel {
  const providers = getProviders();
  if (providers.length === 0) {
    throw new Error(
      "No AI providers configured. Set at least one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY"
    );
  }

  // Try primary model first
  const primary = parseModelSpec(process.env.PRIMARY_MODEL);
  if (primary) {
    const provider = providers.find((p) => p.name === primary.provider);
    if (provider) return provider.createModel(primary.model);
  }

  // Deep reasoning mode: prefer Anthropic's Claude for complex logic
  if (preferDeepReasoning) {
    const anthropic = providers.find((p) => p.name === "anthropic");
    if (anthropic) return anthropic.createModel("claude-sonnet-4-20250514");
  }

  // Fallback chain
  const fallback = parseModelSpec(process.env.FALLBACK_MODEL);
  if (fallback) {
    const provider = providers.find((p) => p.name === fallback.provider);
    if (provider) return provider.createModel(fallback.model);
  }

  // Use first available
  return providers[0].createModel(providers[0].defaultModel);
}

export async function generateResponse(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  options: {
    system?: string;
    deepReasoning?: boolean;
    maxTokens?: number;
    temperature?: number;
  } = {}
) {
  const model = getModel(options.deepReasoning);

  return generateText({
    model,
    messages,
    system: options.system,
    maxTokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.7,
  });
}

export async function streamResponse(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  options: {
    system?: string;
    deepReasoning?: boolean;
    maxTokens?: number;
    temperature?: number;
  } = {}
) {
  const model = getModel(options.deepReasoning);

  return streamText({
    model,
    messages,
    system: options.system,
    maxTokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.7,
  });
}

export function listAvailableProviders(): string[] {
  return getProviders().map((p) => p.name);
}
