import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../../../src/components/StatusBadge";

describe("StatusBadge", () => {
  it("UT-COMP-001: 指定したステータスのテキストが表示される", () => {
    render(<StatusBadge status="要確認" />);
    expect(screen.getByText("要確認")).toBeInTheDocument();
  });
});
