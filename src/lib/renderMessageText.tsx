import React from "react";

const EMOJI_RE = /(\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*\uFE0F?)/gu;

export function renderMessageText(text: string): React.ReactNode[] {
  if (!text) return [];
  const parts = text.split(EMOJI_RE);
  return parts
    .filter((p) => p !== "")
    .map((part, i) =>
      EMOJI_RE.test(part) ? (
        <span key={i} className="emoji">
          {part}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    );
}
