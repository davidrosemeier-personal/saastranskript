import type { TranscriptSegment } from "../../types.js";

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function generateTranscriptMarkdown(segments: TranscriptSegment[]): string {
  const lines: string[] = ["# Meeting Transcript", ""];
  for (const segment of segments) {
    const speaker = segment.speaker_name ?? segment.speaker_label;
    lines.push(`**${speaker}** _(${formatTimestamp(segment.start_ms)})_`);
    lines.push(segment.text);
    lines.push("");
  }
  return lines.join("\n");
}
