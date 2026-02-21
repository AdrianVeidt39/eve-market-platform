import { buildServer } from './server.js';

async function main(): Promise<void> {
  const app = buildServer();
  const port = Number(process.env.PORT ?? '3001');
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen({ port, host });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
