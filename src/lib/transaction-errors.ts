export function getFriendlyTransactionErrorMessage(
  error: unknown,
  fallback = "Transaction failed"
) {
  if (!(error instanceof Error)) return fallback;

  const message = error.message.toLowerCase();

  if (
    message.includes("user denied transaction signature") ||
    message.includes("user rejected the request") ||
    message.includes("user rejected") ||
    message.includes("request rejected")
  ) {
    return "Transaction cancelled in wallet.";
  }

  if (
    message.includes("insufficient funds for gas") ||
    message.includes("insufficient funds for gas * price + value") ||
    (message.includes("have ") && message.includes(" want "))
  ) {
    return "Your wallet does not have enough Sepolia ETH to pay for gas.";
  }

  return error.message;
}
