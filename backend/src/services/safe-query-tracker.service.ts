export async function trackedQuery(name: string, fn: () => Promise<any>) {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;

  if (duration > 200) {
    console.log(`⚠️ Slow query [${name}] ${duration}ms`);
  }

  return result;
}
