const ALCHEMY_URL = `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;

type JsonRpcSuccess<T> = {
  jsonrpc: "2.0";
  id: number;
  result: T;
};

type JsonRpcError = {
  jsonrpc: "2.0";
  id: number;
  error: {
    code: number;
    message: string;
  };
};

export async function alchemyRpc<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(ALCHEMY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Alchemy RPC ${method} HTTP ${response.status}${body ? `: ${body}` : ""}`
    );
  }

  const data = (await response.json()) as JsonRpcSuccess<T> | JsonRpcError;

  if ("error" in data) {
    throw new Error(data.error.message);
  }

  return data.result;
}
