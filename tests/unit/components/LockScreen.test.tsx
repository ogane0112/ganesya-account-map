import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LockScreen } from "../../../src/pages/LockScreen";
import { RouterProvider } from "../../../src/lib/router";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.pushState({}, "", "/lock");
});

describe("LockScreen", () => {
  it("UT-COMP-002: パスワード入力欄と解除ボタンが表示される", () => {
    render(
      <RouterProvider>
        <LockScreen />
      </RouterProvider>,
    );
    expect(screen.getByLabelText("マスターパスワード")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ロック解除" })).toBeInTheDocument();
  });
});
