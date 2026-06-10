import type { AdminGlobalTotals } from "@/lib/admin-stats";

type AdminSummaryLineProps = {
  totals: AdminGlobalTotals;
};

export function AdminSummaryLine({ totals }: AdminSummaryLineProps) {
  const parts = [
    `Users ${totals.userCount}`,
    `Plans ${totals.planCount}`,
    `Items ${totals.itemCount}`,
  ];

  if (totals.planShareCount > 0) {
    parts.push(`Shares ${totals.planShareCount}`);
  }

  return (
    <p className="text-sm text-muted">{parts.join(" · ")}</p>
  );
}
