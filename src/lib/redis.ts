export async function acquireLock(key: string, ttlMs: number = 5000): Promise<string | null> {
  return "no-redis-lock";
}
export async function releaseLock(key: string, lockValue: string): Promise<void> {
  return;
}
