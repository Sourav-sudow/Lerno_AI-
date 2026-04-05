export type ExamQuestion = {
  question: string;
  marks: number;
};

export type GeneratedExamQuestions = {
  fiveMarkQuestions: ExamQuestion[];
  tenMarkQuestions: ExamQuestion[];
};

const EXAM_MODEL = import.meta.env.VITE_OPENROUTER_QUIZ_MODEL || "openrouter/auto";

const systemPrompt = `You are a university exam question generator for engineering students.
Generate important descriptive exam questions based on the given topic.
- Respond with JSON only. No markdown, no bullets, no code fences.
- Questions should be university exam style (descriptive, not MCQs).
- Questions should test deep understanding and application of concepts.
- 5-mark questions should be answerable in 200-300 words.
- 10-mark questions should be comprehensive, requiring detailed explanations, diagrams, or examples.
- Stay strictly on the provided topic.
- Questions should be suitable for B.Tech/university level exams.

JSON schema:
{
  "fiveMarkQuestions": [
    { "question": "...", "marks": 5 },
    { "question": "...", "marks": 5 },
    { "question": "...", "marks": 5 }
  ],
  "tenMarkQuestions": [
    { "question": "...", "marks": 10 },
    { "question": "...", "marks": 10 }
  ]
}`;

function fallbackQuestions(topic: string): GeneratedExamQuestions {
  return {
    fiveMarkQuestions: [
      { question: `Define ${topic} and explain its significance in computer science.`, marks: 5 },
      { question: `List and briefly explain the key components of ${topic}.`, marks: 5 },
      { question: `What are the advantages and disadvantages of ${topic}?`, marks: 5 },
    ],
    tenMarkQuestions: [
      { question: `Explain ${topic} in detail with a suitable diagram and real-world example.`, marks: 10 },
      { question: `Compare and contrast different approaches in ${topic}. Provide examples to support your answer.`, marks: 10 },
    ],
  };
}

function sanitizeJson(text: string): string {
  // Prefer fenced block
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced && fenced[1] ? fenced[1] : text;

  // Trim to object
  const first = body.indexOf("{");
  const last = body.lastIndexOf("}");
  if (first === -1 || last === -1) return body.trim();
  return body.slice(first, last + 1).trim();
}

export async function generateExamQuestions(
  topic: string,
  context?: string
): Promise<GeneratedExamQuestions> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("OpenRouter API key not set; returning fallback questions");
    return fallbackQuestions(topic);
  }

  const userPrompt = context
    ? `Topic: ${topic}\n\nContext: ${context}\n\nGenerate 3 important 5-mark questions and 2 important 10-mark questions for university exams on this topic.`
    : `Topic: ${topic}\n\nGenerate 3 important 5-mark questions and 2 important 10-mark questions for university exams on this topic.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Lerno.ai Exam Questions",
      },
      body: JSON.stringify({
        model: EXAM_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      return fallbackQuestions(topic);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    if (!content) {
      console.warn("Empty response from API; returning fallback");
      return fallbackQuestions(topic);
    }

    const cleaned = sanitizeJson(content);
    const parsed = JSON.parse(cleaned) as GeneratedExamQuestions;

    // Validate structure
    if (
      !Array.isArray(parsed.fiveMarkQuestions) ||
      !Array.isArray(parsed.tenMarkQuestions)
    ) {
      console.warn("Invalid response structure; returning fallback");
      return fallbackQuestions(topic);
    }

    return parsed;
  } catch (err) {
    console.error("Failed to generate exam questions:", err);
    return fallbackQuestions(topic);
  }
}
