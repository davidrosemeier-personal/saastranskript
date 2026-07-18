import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

function run(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited with code ${code}: ${stderr}`));
    });
  });
}

export async function probeDurationSeconds(audioBuffer: Buffer, extension: string): Promise<number> {
  const dir = await mkdtemp(path.join(tmpdir(), "audio-probe-"));
  const inputPath = path.join(dir, `input${extension}`);
  try {
    await writeFile(inputPath, audioBuffer);
    const { stdout } = await run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      inputPath,
    ]);
    const seconds = parseFloat(stdout.trim());
    if (!Number.isFinite(seconds)) throw new Error("ffprobe returned a non-numeric duration");
    return seconds;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Extracts a short clip (a few seconds) starting at startMs, for speaker sample playback. */
export async function extractSampleClip(
  audioBuffer: Buffer,
  extension: string,
  startMs: number,
  durationSeconds = 4
): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "audio-clip-"));
  const inputPath = path.join(dir, `input${extension}`);
  const outputPath = path.join(dir, "clip.mp3");
  try {
    await writeFile(inputPath, audioBuffer);
    await run("ffmpeg", [
      "-y",
      "-ss",
      (startMs / 1000).toFixed(3),
      "-i",
      inputPath,
      "-t",
      String(durationSeconds),
      "-vn",
      "-acodec",
      "libmp3lame",
      outputPath,
    ]);
    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
