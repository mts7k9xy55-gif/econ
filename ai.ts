import type { LedgerRow } from "./ledger";

export type AiDecision = {
  category: string;
  action: string;
  reason?: string;
};

type EnvLike = {
  AI?: Ai;
  AI_PROVIDER?: string;
  AI_MODEL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  INFRA_ALERT_THRESHOLD?: string;
};

export async function processAI(env: EnvLike, tx: LedgerRow): Promise<AiDecision> {
  const provider = (env.AI_PROVIDER ?? "").toLowerCase();
  try {
    if (provider === "cloudflare" && env.AI) {
      return await callCloudflare(env, tx);
    }

    if (provider === "gemini" && env.GEMINI_API_KEY) {
      return await callGemini(env, tx);
    }

    if (provider === "groq" && env.GROQ_API_KEY) {
      return await callGroq(env, tx);
    }

    if (provider === "openai" && env.OPENAI_API_KEY) {
      return await callOpenAI(env, tx);
    }

    if (provider === "anthropic" && env.ANTHROPIC_API_KEY) {
      return await callAnthropic(env, tx);
    }
  } catch (error) {
    console.warn(`AI provider ${provider || "unset"} failed, using heuristic fallback`, error);
  }

  return heuristicDecision(env, tx);
}

async function callCloudflare(env: EnvLike, tx: LedgerRow): Promise<AiDecision> {
  const model = (env.AI_MODEL ?? "@cf/meta/llama-3.1-8b-instruct") as keyof AiModels;
  const output = await env.AI!.run(model, {
    prompt: `${systemPrompt()}\n\n${buildPrompt(tx)}`,
  });

  return normalizeDecision(parseJsonDecision(extractText(output)), env, tx);
}

async function callGemini(env: EnvLike, tx: LedgerRow): Promise<AiDecision> {
  const model = env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": env.GEMINI_API_KEY ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt() }],
        },
        contents: [
          {
            parts: [{ text: buildPrompt(tx) }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: decisionSchema(),
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status} ${await response.text()}`);
  }

  const json = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const raw =
    json.candidates?.flatMap((candidate) => candidate.content?.parts ?? []).map((part) => part.text ?? "").join("\n") ??
    "";

  return normalizeDecision(parseJsonDecision(raw), env, tx);
}

async function callGroq(env: EnvLike, tx: LedgerRow): Promise<AiDecision> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: systemPrompt(),
        },
        {
          role: "user",
          content: buildPrompt(tx),
        },
      ],
      response_format: {
        type: "json_object",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq request failed: ${response.status} ${await response.text()}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = json.choices?.[0]?.message?.content ?? "";
  return normalizeDecision(parseJsonDecision(raw), env, tx);
}

async function callOpenAI(env: EnvLike, tx: LedgerRow): Promise<AiDecision> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                systemPrompt(),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildPrompt(tx),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "finance_decision",
          schema: decisionSchema(),
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status} ${await response.text()}`);
  }

  const json = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };

  const raw =
    json.output_text ??
    json.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("\n") ??
    "";

  return normalizeDecision(parseJsonDecision(raw), env, tx);
}

async function callAnthropic(env: EnvLike, tx: LedgerRow): Promise<AiDecision> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest",
      max_tokens: 300,
      system: systemPrompt(),
      messages: [
        {
          role: "user",
          content: buildPrompt(tx),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed: ${response.status} ${await response.text()}`);
  }

  const json = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const raw =
    json.content?.filter((item) => item.type === "text").map((item) => item.text ?? "").join("\n") ?? "";

  return normalizeDecision(parseJsonDecision(raw), env, tx);
}

function systemPrompt(): string {
  return "You are a Japanese corporate finance operator. Classify the transaction and choose exactly one action.";
}

function decisionSchema() {
  return {
    type: "object",
    properties: {
      category: { type: "string" },
      action: { type: "string" },
      reason: { type: "string" },
    },
    required: ["category", "action"],
    additionalProperties: false,
  };
}

function buildPrompt(tx: LedgerRow): string {
  return [
    "会社の財務AIです。",
    "この取引のカテゴリと必要アクションを判断してください。",
    "action は以下から1つだけ選ぶこと:",
    '["none","invoice","reserve_tax","alert_cost_increase","alert_cash_outflow","notify_slack"]',
    "",
    `date: ${tx.date}`,
    `description: ${tx.description}`,
    `amount: ${tx.amount}`,
    `source: ${tx.source}`,
    "",
    "出力JSON:",
    '{ "category": "", "action": "", "reason": "" }',
  ].join("\n");
}

function parseJsonDecision(raw: string): Partial<AiDecision> {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? trimmed;

  try {
    return JSON.parse(candidate) as Partial<AiDecision>;
  } catch {
    return {};
  }
}

function normalizeDecision(candidate: Partial<AiDecision>, env: EnvLike, tx: LedgerRow): AiDecision {
  if (candidate.category && candidate.action) {
    return {
      category: candidate.category,
      action: candidate.action,
      reason: candidate.reason,
    };
  }

  return heuristicDecision(env, tx);
}

function heuristicDecision(env: EnvLike, tx: LedgerRow): AiDecision {
  const text = `${tx.description} ${tx.source}`.toLowerCase();
  const infraAlertThreshold = Number(env.INFRA_ALERT_THRESHOLD ?? "50000");

  if (includesAny(text, ["stripe", "payment", "invoice paid", "入金", "売上"])) {
    return {
      category: "revenue",
      action: "none",
      reason: "Payment-like transaction.",
    };
  }

  if (includesAny(text, ["aws", "gcp", "azure", "openai", "anthropic", "cloudflare"])) {
    return {
      category: "infra_cost",
      action: tx.amount >= infraAlertThreshold ? "alert_cost_increase" : "none",
      reason: "Infrastructure vendor detected.",
    };
  }

  if (includesAny(text, ["税", "tax", "vat", "消費税"])) {
    return {
      category: "tax",
      action: "reserve_tax",
      reason: "Tax-related transaction.",
    };
  }

  if (tx.amount < 0 || includesAny(text, ["refund", "chargeback"])) {
    return {
      category: "cash_outflow",
      action: "alert_cash_outflow",
      reason: "Negative or refund-like transaction.",
    };
  }

  return {
    category: "uncategorized",
    action: "notify_slack",
    reason: "Fallback path without model output.",
  };
}

function includesAny(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern));
}

function extractText(output: unknown): string {
  if (typeof output === "string") {
    return output;
  }

  if (output && typeof output === "object") {
    const record = output as Record<string, unknown>;
    if (typeof record.response === "string") {
      return record.response;
    }
    if (typeof record.result === "string") {
      return record.result;
    }
    if (record.result && typeof record.result === "object") {
      const nested = record.result as Record<string, unknown>;
      if (typeof nested.response === "string") {
        return nested.response;
      }
    }
  }

  return "";
}
