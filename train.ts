import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

type Step = {
  message: string;
  seconds: number;
  cues: readonly number[];
};

type Workout = {
  label: string;
  rounds: number;
  steps: readonly Step[];
};

export const WORKOUTS = {
  plank: {
    label: 'プランク',
    rounds: 1,
    steps: [
      { message: 'ダイアゴナルプランク', seconds: 30, cues: [20, 10] },
      { message: '交代', seconds: 30, cues: [20, 10] },
      { message: 'サイドプランク', seconds: 30, cues: [20, 10] },
      { message: '交代', seconds: 30, cues: [20, 10] },
      { message: 'バックプランク', seconds: 30, cues: [20, 10] },
    ],
  },
  pushup: {
    label: '腕立て',
    rounds: 1,
    steps: [
      { message: 'うでたて', seconds: 10, cues: [9, 8, 7, 6, 5, 4, 3, 2, 1] },
      { message: 'レスト', seconds: 30, cues: [] },
    ],
  },
  kettlebell_swing: {
    label: 'ケトルベルスイング',
    rounds: 6,
    steps: [
      { message: 'ケトルベルスイング', seconds: 30, cues: [] },
      { message: 'レスト', seconds: 30, cues: [] },
    ],
  },
} satisfies Record<string, Workout>;

export type WorkoutName = keyof typeof WORKOUTS;

export function isWorkoutName(name: string): name is WorkoutName {
  return Object.hasOwn(WORKOUTS, name);
}

async function say(message: string, signal: AbortSignal): Promise<void> {
  const token = process.env.HA_TOKEN;
  if (!token) throw new Error('HA_TOKEN is not set');

  const haUrl = process.env.HA_URL ?? 'http://192.168.50.232:8123';
  const response = await fetch(`${haUrl}/api/services/tts/speak`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      entity_id: 'tts.google_translate_ja_com',
      media_player_entity_id: 'media_player.taininku_rumu',
      message,
    }),
    signal,
  });
  if (!response.ok) throw new Error(`Home Assistant TTS failed: ${response.status}`);
  await response.text();
}

async function waitUntil(deadline: number, signal: AbortSignal): Promise<void> {
  await sleep(Math.max(0, deadline - performance.now()), undefined, { signal });
}

async function runStep(step: Step, signal: AbortSignal): Promise<void> {
  await say(step.message, signal);
  const started = performance.now();

  for (const remaining of step.cues) {
    await waitUntil(started + (step.seconds - remaining) * 1000, signal);
    await say('remaining', signal);
  }

  await waitUntil(started + step.seconds * 1000, signal);
  await say('完了', signal);
}

export async function runWorkout(name: WorkoutName, signal: AbortSignal): Promise<void> {
  const preparationSeconds = 5;
  const workout: Workout = WORKOUTS[name];
  await say(`${preparationSeconds}秒後に${workout.label}開始`, signal);
  await sleep(preparationSeconds * 1000, undefined, { signal });

  for (let round = 0; round < workout.rounds; round++) {
    for (const step of workout.steps) await runStep(step, signal);
  }
  await say('終了', signal);
}

async function main(): Promise<void> {
  const name = process.argv[2];
  if (!name || !isWorkoutName(name)) throw new Error(`Unknown workout: ${name}`);
  const controller = new AbortController();
  process.once('SIGINT', () => controller.abort());
  await runWorkout(name, controller.signal);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch((error: unknown) => {
    if (error instanceof Error && error.name === 'AbortError') return;
    console.error(error);
    process.exitCode = 1;
  });
}
