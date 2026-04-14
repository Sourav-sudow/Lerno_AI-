import {
  compressModelContext,
  createOpenRouterChatCompletion,
  getOpenRouterApiKeys,
  getOpenRouterMaxTokens,
} from "./openRouterClient";

const TUTOR_MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";
const OPENROUTER_TUTOR_MODEL =
  import.meta.env.VITE_OPENROUTER_TUTOR_MODEL || "openrouter/auto";

type TutorRequest = {
  topic: string;
  question: string;
  lessonContent?: string;
};

function shouldFallbackToOpenRouter(error: unknown) {
  const message = (error as Error)?.message?.toLowerCase() || "";
  return (
    message.includes("gemini tutor error 429") ||
    message.includes("gemini tutor error 500") ||
    message.includes("gemini tutor error 502") ||
    message.includes("gemini tutor error 503") ||
    message.includes("gemini tutor error 504") ||
    message.includes("high demand") ||
    message.includes("try again later")
  );
}

function buildTutorPrompt(topic: string, question: string, lessonContent?: string) {
  const lessonContext = compressModelContext(lessonContent, 900);

  return `You are Lerno AI Tutor for the topic "${topic}".

Rules:
- Answer only questions related to the current topic or lesson context.
- If the user goes off-topic, politely redirect them back to "${topic}".
- Explain in simple English with a friendly teaching tone.
- Prefer short sections, bullets, and small examples over one long paragraph.
- Keep the answer concise unless the user asks for detail.
- When useful, use headings like "Quick answer", "Key points", and "Example".

${lessonContext ? `Lesson context:\n${lessonContext}` : "Lesson context unavailable."}

Student question:
${question}`;
}

async function askGemini(topic: string, question: string, lessonContent: string | undefined, apiKey: string) {
  const prompt = buildTutorPrompt(topic, question, lessonContent);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(TUTOR_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 320,
        },
      }),
    }
  );

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    const fallback = await res.text();
    throw new Error(`Gemini tutor parse error: ${fallback}`);
  }

  if (!res.ok) {
    const d = data as { error?: { message?: string; status?: string } };
    const errText =
      d?.error?.message || d?.error?.status || JSON.stringify(data);
    throw new Error(`Gemini tutor error ${res.status}: ${errText}`);
  }

  const d = data as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
    promptFeedback?: { blockReason?: string };
    error?: { message?: string };
  };

  const content =
    d?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("") || "";

  if (!content || !String(content).trim()) {
    const detail =
      d?.promptFeedback?.blockReason ||
      d?.error?.message ||
      "Tutor response was empty. Check your Gemini model/key env settings.";
    throw new Error(detail);
  }

  return String(content).trim();
}

async function askOpenRouter(
  topic: string,
  question: string,
  lessonContent: string | undefined
) {
  const lessonContext = compressModelContext(lessonContent, 900);

  return createOpenRouterChatCompletion({
    model: OPENROUTER_TUTOR_MODEL,
    title: "Lerno AI Tutor",
    maxTokens: getOpenRouterMaxTokens("tutor"),
    minTokens: 96,
    temperature: 0.55,
    messages: [
      {
        role: "system",
        content:
          `You are Lerno AI Tutor for "${topic}". Stay on-topic, explain simply, use short sections, and keep the answer compact unless asked for more detail.`,
      },
      {
        role: "user",
        content: [
          `Topic: ${topic}`,
          lessonContext ? `Lesson context: ${lessonContext}` : "",
          `Student question: ${question}`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
  });
}

export async function askAITutor({
  topic,
  question,
  lessonContent,
}: TutorRequest) {
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  const hasOpenRouterKey = getOpenRouterApiKeys().length > 0;

  if (geminiKey) {
    try {
      return await askGemini(topic, question, lessonContent, geminiKey);
    } catch (error) {
      if (hasOpenRouterKey && shouldFallbackToOpenRouter(error)) {
        return askOpenRouter(topic, question, lessonContent);
      }
      throw error;
    }
  }

  if (hasOpenRouterKey) {
    return askOpenRouter(topic, question, lessonContent);
  }

  throw new Error(
    "Add VITE_GEMINI_API_KEY or VITE_OPENROUTER_API_KEY / VITE_OPENROUTER_API_KEY_1..3 to .env.local, then restart npm run dev."
  );
}
