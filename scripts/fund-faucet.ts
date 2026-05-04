import hre from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const erc20Abi = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

async function main() {
  const { ethers } = hre;

  const faucetAddress = process.env.FAUCET_ADDRESS;
  const usdcAddress = process.env.USDC_SEPOLIA_ADDRESS;
  const usdtAddress = process.env.USDT_SEPOLIA_ADDRESS;
  const usdcFundAmount = process.env.USDC_FUND_AMOUNT;
  const usdtFundAmount = process.env.USDT_FUND_AMOUNT;

  if (!faucetAddress) throw new Error("Missing FAUCET_ADDRESS");
  if (!usdcAddress) throw new Error("Missing USDC_SEPOLIA_ADDRESS");
  if (!usdtAddress) throw new Error("Missing USDT_SEPOLIA_ADDRESS");
  if (!usdcFundAmount) throw new Error("Missing USDC_FUND_AMOUNT");
  if (!usdtFundAmount) throw new Error("Missing USDT_FUND_AMOUNT");

  const [owner] = await ethers.getSigners();
  console.log("Funding faucet with account:", owner.address);
  console.log("Faucet:", faucetAddress);

  const faucet = await ethers.getContractAt("MultiTokenFaucet", faucetAddress);
  const usdc = await ethers.getContractAt(erc20Abi, usdcAddress);
  const usdt = await ethers.getContractAt(erc20Abi, usdtAddress);

  const supportedTokens = await faucet.getSupportedTokens();
  const supportedSet = new Set(
    supportedTokens.map((token: string) => token.toLowerCase())
  );

  if (!supportedSet.has(usdcAddress.toLowerCase())) {
    throw new Error(`USDC address ${usdcAddress} is not supported by faucet ${faucetAddress}`);
  }

  if (!supportedSet.has(usdtAddress.toLowerCase())) {
    throw new Error(`USDT address ${usdtAddress} is not supported by faucet ${faucetAddress}`);
  }

  const ownerUsdcBalance = await usdc.balanceOf(owner.address);
  const ownerUsdtBalance = await usdt.balanceOf(owner.address);

  console.log("Owner USDC balance:", ownerUsdcBalance.toString());
  console.log("Owner USDT balance:", ownerUsdtBalance.toString());

  console.log("Funding USDC...");
  const usdcTx = await usdc.transfer(faucetAddress, BigInt(usdcFundAmount));
  await usdcTx.wait();
  console.log("USDC funded");

  console.log("Funding USDT...");
  const usdtTx = await usdt.transfer(faucetAddress, BigInt(usdtFundAmount));
  await usdtTx.wait();
  console.log("USDT funded");

  const faucetUsdcBalance = await usdc.balanceOf(faucetAddress);
  const faucetUsdtBalance = await usdt.balanceOf(faucetAddress);

  console.log("Faucet USDC balance:", faucetUsdcBalance.toString());
  console.log("Faucet USDT balance:", faucetUsdtBalance.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
