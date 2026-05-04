import { NormalizedApproval } from "./normalize-approvals";

// Simple V1 risk rules for MVP
export function applyRiskRules(approval: NormalizedApproval): NormalizedApproval {
  const riskReasons: string[] = [];
  let riskLevel: "low" | "medium" | "high" = "low";

  // Rule 1: Unlimited approval is high risk
  if (approval.isUnlimited) {
    riskReasons.push("Unlimited approval (max uint256)");
    riskLevel = "high";
  }

  // Rule 2: Approval older than 90 days is medium/high risk
  if (approval.approvalAgeDays > 90) {
    riskReasons.push(`Approval is ${approval.approvalAgeDays} days old (stale)`);
    if (riskLevel !== "high") riskLevel = "medium";
  }

  // Rule 3: Basic spender check (placeholder for future trust score)
  // For V1, we just flag unknown spenders as medium risk if no other risks
  if (riskReasons.length === 0) {
    riskLevel = "low";
  }

  return {
    ...approval,
    riskLevel,
    riskReasons,
  };
}

// Helper to sort approvals by risk (high first, then medium, then low)
export function sortByRisk(approvals: NormalizedApproval[]): NormalizedApproval[] {
  const riskOrder = { high: 0, medium: 1, low: 2 };
  return approvals.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);
}