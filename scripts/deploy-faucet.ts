import hre from "hardhat";

async function main() {
  const { ethers } = hre;

  const [deployer] = await ethers.getSigners();

  console.log("Deploying MultiTokenFaucet with account:", deployer.address);

  const MultiTokenFaucet = await ethers.getContractFactory("MultiTokenFaucet");
  const faucet = await MultiTokenFaucet.deploy(deployer.address);

  await faucet.waitForDeployment();

  console.log("MultiTokenFaucet deployed to:", await faucet.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
