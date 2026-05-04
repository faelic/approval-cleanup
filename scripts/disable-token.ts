import hre from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const { ethers } = hre;

  const faucetAddress = process.env.FAUCET_ADDRESS;
  const tokenAddress = process.env.TOKEN_ADDRESS;

  if (!faucetAddress) throw new Error("Missing FAUCET_ADDRESS");
  if (!tokenAddress) throw new Error("Missing TOKEN_ADDRESS");

  const [owner] = await ethers.getSigners();
  console.log("Disabling token with account:", owner.address);
  console.log("Faucet:", faucetAddress);
  console.log("Token:", tokenAddress);

  const faucet = await ethers.getContractAt("MultiTokenFaucet", faucetAddress);
  const tx = await faucet.disableToken(tokenAddress);
  await tx.wait();

  console.log("Token disabled");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
