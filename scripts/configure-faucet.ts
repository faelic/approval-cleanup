import hre from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const { ethers } = hre;

  const faucetAddress = process.env.FAUCET_ADDRESS;
  const usdcAddress = process.env.USDC_SEPOLIA_ADDRESS;
  const usdtAddress = process.env.USDT_SEPOLIA_ADDRESS;
  const usdcClaimAmount = process.env.USDC_CLAIM_AMOUNT;
  const usdtClaimAmount = process.env.USDT_CLAIM_AMOUNT;

  if (!faucetAddress) throw new Error("Missing FAUCET_ADDRESS");
  if (!usdcAddress) throw new Error("Missing USDC_SEPOLIA_ADDRESS");
  if (!usdtAddress) throw new Error("Missing USDT_SEPOLIA_ADDRESS");
  if (!usdcClaimAmount) throw new Error("Missing USDC_CLAIM_AMOUNT");
  if (!usdtClaimAmount) throw new Error("Missing USDT_CLAIM_AMOUNT");

  const [owner] = await ethers.getSigners();
  console.log("Configuring faucet with account:", owner.address);
  console.log("Faucet:", faucetAddress);

  const faucet = await ethers.getContractAt("MultiTokenFaucet", faucetAddress);

  console.log("Configuring USDC...");
  const usdcTx = await faucet.configureToken(
    usdcAddress,
    BigInt(usdcClaimAmount),
    true
  );
  await usdcTx.wait();
  console.log("USDC configured");

  console.log("Configuring USDT...");
  const usdtTx = await faucet.configureToken(
    usdtAddress,
    BigInt(usdtClaimAmount),
    true
  );
  await usdtTx.wait();
  console.log("USDT configured");

  const supportedTokens = await faucet.getSupportedTokens();
  console.log("Supported tokens:", supportedTokens);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
