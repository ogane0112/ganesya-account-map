const LOCK_HASH_KEY = "accountMap.lockHash";
const UNLOCKED_KEY = "accountMap.unlocked";

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function isLockConfigured(): boolean {
  return localStorage.getItem(LOCK_HASH_KEY) !== null;
}

export async function setLockPassword(password: string): Promise<void> {
  const hash = await hashPassword(password);
  localStorage.setItem(LOCK_HASH_KEY, hash);
}

export function clearLockPassword(): void {
  localStorage.removeItem(LOCK_HASH_KEY);
  sessionStorage.removeItem(UNLOCKED_KEY);
}

export async function tryUnlock(password: string): Promise<boolean> {
  const storedHash = localStorage.getItem(LOCK_HASH_KEY);
  if (!storedHash) {
    return true;
  }
  const inputHash = await hashPassword(password);
  const matched = inputHash === storedHash;
  if (matched) {
    sessionStorage.setItem(UNLOCKED_KEY, "1");
  }
  return matched;
}

export function isUnlocked(): boolean {
  if (!isLockConfigured()) {
    return true;
  }
  return sessionStorage.getItem(UNLOCKED_KEY) === "1";
}

export function lockNow(): void {
  sessionStorage.removeItem(UNLOCKED_KEY);
}
