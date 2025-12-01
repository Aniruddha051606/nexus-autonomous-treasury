import { ethers } from "hardhat";

async function main() {
  const [deployer, aiAgent] = await ethers.getSigners();

  console.log("----------------------------------------------------");
  console.log("🚀 Deploying NexusVault (Stable Ethers)...");
  console.log("👨‍✈️ Admin:", deployer.address);
  console.log("🤖 AI Agent:", aiAgent.address);

  // 1. Set Daily Limit (500 MNEE with 18 decimals)
  const dailyLimit = ethers.parseUnits("500", 18);

  // 2. Deploy
  const NexusVault = await ethers.getContractFactory("NexusVault");
  const vault = await NexusVault.deploy(aiAgent.address, dailyLimit);

  await vault.waitForDeployment();

  console.log("----------------------------------------------------");
  console.log(`✅ NexusVault Deployed at: ${await vault.getAddress()}`);
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});