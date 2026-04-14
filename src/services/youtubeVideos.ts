import topicVideos from "../../data/topicVideos.json";
import { fetchTopicVideoOverride } from "./topicVideoOverrides";

const VIDEO_CACHE_PREFIX = "lernoResolvedVideo::";

type TopicVideoValue = string | string[];

function normalizeEmbedUrl(url: string): string {
  if (!url) return "";
  if (url.includes("youtube.com/embed/")) return url;

  const shortMatch = url.match(/youtu\.be\/([^?&/]+)/i);
  if (shortMatch?.[1]) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }

  const watchMatch = url.match(/[?&]v=([^?&/]+)/i);
  if (watchMatch?.[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }

  const idMatch = url.match(/^([a-zA-Z0-9_-]{11})$/);
  if (idMatch?.[1]) {
    return `https://www.youtube.com/embed/${idMatch[1]}`;
  }

  return "";
}

function getMappedVideoUrl(title: string): string | null {
  const normalizedTitle = title.trim().toLowerCase();
  const subjects = Object.values(topicVideos || {}) as Record<string, Record<string, TopicVideoValue>>[];

  for (const subject of subjects) {
    for (const unit of Object.values(subject || {})) {
      for (const [topicName, value] of Object.entries(unit || {})) {
        if (topicName.trim().toLowerCase() !== normalizedTitle) continue;

        if (Array.isArray(value)) {
          return normalizeEmbedUrl(value[0] || "");
        }

        if (typeof value === "string") {
          return normalizeEmbedUrl(value);
        }
      }
    }
  }

  return null;
}

async function searchYoutubeVideo(query: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
  if (!apiKey) return null;

  const cacheKey = `${VIDEO_CACHE_PREFIX}${query.toLowerCase()}`;
  const cachedUrl = localStorage.getItem(cacheKey);
  if (cachedUrl) return cachedUrl;

  const runSearch = async (options: { embeddable: boolean; maxResults: number }) => {
    const params = new URLSearchParams({
      part: "snippet",
      maxResults: String(options.maxResults),
      q: query,
      type: "video",
      key: apiKey,
    });

    if (options.embeddable) {
      params.set("videoEmbeddable", "true");
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const items = Array.isArray(data?.items) ? data.items : [];

    for (const item of items) {
      const videoId = item?.id?.videoId;
      const embedUrl = normalizeEmbedUrl(String(videoId || ""));
      if (embedUrl) {
        localStorage.setItem(cacheKey, embedUrl);
        return embedUrl;
      }
    }

    return null;
  };

  try {
    const strictResult = await runSearch({ embeddable: true, maxResults: 3 });
    if (strictResult) return strictResult;

    const relaxedResult = await runSearch({ embeddable: false, maxResults: 5 });
    if (relaxedResult) return relaxedResult;
  } catch (error) {
    console.warn("YouTube search failed for query:", query, error);
  }

  return null;
}

export async function resolveTopicVideo(input: {
  title: string;
  universityId?: string;
  subjectTitle?: string;
  unitTitle?: string;
}): Promise<string | null> {
  let override: Awaited<ReturnType<typeof fetchTopicVideoOverride>> = null;
  try {
    override = await fetchTopicVideoOverride({
      universityId: input.universityId,
      subjectTitle: input.subjectTitle,
      unitTitle: input.unitTitle,
      topicTitle: input.title,
    });
  } catch {
    // Production has no local FastAPI; failed fetch must not block JSON / YouTube fallbacks.
    override = null;
  }
  if (override?.videoUrl) {
    return override.videoUrl;
  }

  const mappedUrl = getMappedVideoUrl(input.title);
  if (mappedUrl) return mappedUrl;

  const searchTerms = [
    `${input.title} ${input.subjectTitle || ""} tutorial`,
    `${input.title} explained`,
  ];

  for (const query of searchTerms) {
    const result = await searchYoutubeVideo(query.trim());
    if (result) return result;
  }

  return null;
}

export { normalizeEmbedUrl };
