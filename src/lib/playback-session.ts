const SESSION_ID_KEY = "freqy-play-session-id";

export function getOrCreatePlaybackSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = window.sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }

  return sessionId;
}
