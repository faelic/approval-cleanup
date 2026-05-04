type TxStatus = "idle" | "pending" | "success" | "error";

type TxStatusProps = {
  status: TxStatus;
  txHash?: string;
  errorMessage?: string;
};

export default function TxStatus({ status, txHash, errorMessage }: TxStatusProps) {
  if (status === "idle") return null;

  return (
    <div className="rounded-xl border p-4 text-sm">
      {status === "pending" ? (
        <p className="text-amber-600">
          Transaction pending. Confirm it in your wallet and wait for the network to finalize it.
        </p>
      ) : null}

      {status === "success" ? (
        <div className="space-y-1 text-emerald-600">
          <p>Approval update confirmed successfully.</p>
          {txHash ? <p className="text-muted-foreground">Hash: {txHash}</p> : null}
        </div>
      ) : null}

      {status === "error" ? (
        <div className="space-y-1 text-red-600">
          <p>Transaction failed.</p>
          {errorMessage ? <p className="text-muted-foreground">{errorMessage}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
