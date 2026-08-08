import { beforeEach, describe, expect, it } from "vitest";
import { clearLockPassword, isLockConfigured, isUnlocked, setLockPassword, tryUnlock } from "../../src/lib/lock";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("マスターパスワードロック", () => {
  it("UT-LOCK-001: 未設定時はisUnlockedがtrueを返す", () => {
    expect(isUnlocked()).toBe(true);
  });

  it("UT-LOCK-002: 正しいパスワードでロック解除できる", async () => {
    await setLockPassword("abcd");
    expect(await tryUnlock("abcd")).toBe(true);
    expect(isUnlocked()).toBe(true);
  });

  it("UT-LOCK-003: 誤ったパスワードではロック解除できない", async () => {
    await setLockPassword("abcd");
    expect(await tryUnlock("wrong")).toBe(false);
    expect(isUnlocked()).toBe(false);
  });

  it("UT-LOCK-004: localStorageには平文パスワードが保存されない", async () => {
    await setLockPassword("abcd");
    const stored = localStorage.getItem("accountMap.lockHash");
    expect(stored).not.toBeNull();
    expect(stored).not.toBe("abcd");
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
  });

  it("UT-LOCK-005: clearLockPasswordでロック設定が解除される", async () => {
    await setLockPassword("abcd");
    expect(isLockConfigured()).toBe(true);
    clearLockPassword();
    expect(isLockConfigured()).toBe(false);
  });
});
