const TUTOR_MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";

type TutorRequest = {
  topic: string;
  question: string;
  lessonContent?: string;
};

export async function askAITutor({
  topic,
  question,
  lessonContent,
}: TutorRequest) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VITE_GEMINI_API_KEY in .env.local");
  }

  const lessonContext = lessonContent?.trim()
    ? `Lesson context:\n${lessonContent.trim()}`
    : "Lesson context unavailable.";

  const prompt = `You are Lerno AI Tutor for the topic "${topic}".

Rules:
- Answer only questions related to the current topic or lesson context.
- If the user goes off-topic, politely redirect them back to "${topic}".
- Explain in simple English with a friendly teaching tone.
- Prefer short sections, bullets, and small examples over one long paragraph.
- Keep the answer concise unless the user asks for detail.
- When useful, use headings like "Quick answer", "Key points", and "Example".

${lessonContext}

Student question:
${question}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(TUTOR_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
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
  });

  let data: any;
  try {
    data = await res.json();
  } catch (err) {
    const fallback = await res.text();
    throw new Error(`Gemini tutor parse error: ${fallback}`);
  }

  if (!res.ok) {
    const errText =
      data?.error?.message ||
      data?.error?.status ||
      JSON.stringify(data);
    throw new Error(`Gemini tutor error ${res.status}: ${errText}`);
  }

  const content =
    data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part?.text || "")
      .join("") ||
    "";

  if (!content || !String(content).trim()) {
    const detail =
      data?.promptFeedback?.blockReason ||
      data?.error?.message ||
      "Tutor response was empty. Check your Gemini model/key env settings.";
    throw new Error(detail);
  }

  return String(content).trim();
}
