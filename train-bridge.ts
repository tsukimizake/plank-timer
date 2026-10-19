import { createServer } from 'node:http';
import { isWorkoutName, runWorkout } from './train.ts';

const host = '127.0.0.1';
const port = Number(process.env.TRAIN_PORT || 8765);
const secret = process.env.TRAIN_BRIDGE_TOKEN;
let workout: AbortController | null = null;

if (!secret || !process.env.HA_TOKEN) {
  throw new Error('TRAIN_BRIDGE_TOKEN and HA_TOKEN are required');
}
const server = createServer((request, response) => {
  const send = (status: number, message: string) => {
    response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(`${message}\n`);
  };
  const run = request.url?.match(/^\/run\/([a-z0-9_-]+)$/);
  const route = `${request.method} ${run ? '/run/:name' : request.url}`;

  if (route !== 'GET /health' && request.headers.authorization !== `Bearer ${secret}`) {
    return send(401, 'unauthorized');
  }

  switch (route) {
    case 'GET /health':
      return send(200, workout ? 'running' : 'ready');
    case 'POST /stop':
      if (!workout) return send(200, 'idle');
      workout.abort();
      return send(202, 'stopping');
    case 'POST /run/:name': {
      const name = run?.[1];
      if (!name || !isWorkoutName(name)) return send(404, 'unknown workout');
      if (workout) return send(409, 'workout already running');

      const controller = new AbortController();
      workout = controller;
      void runWorkout(name, controller.signal)
        .catch((error: unknown) => {
          if (!controller.signal.aborted) console.error(`Could not run ${name}:`, error);
        })
        .finally(() => {
          if (workout === controller) workout = null;
        });
      return send(202, `started ${name}`);
    }
    default:
      return request.method === 'POST'
        ? send(404, 'unknown workout')
        : send(405, 'method not allowed');
  }
});

server.listen(port, host, () => console.log(`Train bridge listening on ${host}:${port}`));
process.on('SIGTERM', () => {
  workout?.abort();
  server.close();
});
