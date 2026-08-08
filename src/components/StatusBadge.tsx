import type { AccountStatus } from "../../shared/types";

const STATUS_CLASS: Record<AccountStatus, string> = {
  利用中: "badge badge-active",
  休眠: "badge badge-dormant",
  解約済み: "badge badge-cancelled",
  要確認: "badge badge-review",
};

export function StatusBadge({ status }: { status: AccountStatus }) {
  return <span className={STATUS_CLASS[status]}>{status}</span>;
}
