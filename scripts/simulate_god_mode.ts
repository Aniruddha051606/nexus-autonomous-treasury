import { ethers } from "hardhat";

// --- GOD MODE HELPER ---
async function setTokenBalance(tokenAddress: string, walletAddress: string, amount: bigint, slot: number) {
  const index = ethers.solidityPackedKeccak256(["uint256", "uint256"], [walletAddress, slot]);
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [amount]);
  await ethers.provider.send("hardhat_setStorageAt", [tokenAddress, index, encoded]);
}

async function main() {
  console.log("\n🔵 --- PHASE 1: MNEE HACKATHON SETUP ---");
  const [admin, aiAgent] = await ethers.getSigners();
  
  const MNEE_ADDRESS = "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF";
  const mneeToken = await ethers.getContractAt("IERC20", MNEE_ADDRESS);

  console.log("📜 Deploying NexusVault...");
  
  // Gas Fix for Mainnet Fork
  const feeData = await ethers.provider.getFeeData();
  const overrides = {
    maxFeePerGas: (feeData.maxFeePerGas ?? 0n) * 2n,
    maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas ?? 0n) * 2n
  };

  const dailyLimit = ethers.parseUnits("10000", 6);
  const NexusVault = await ethers.getContractFactory("NexusVault");
  const vault = await NexusVault.deploy(aiAgent.address, dailyLimit, overrides);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  
  console.log(`🏦 NexusVault Deployed at: ${vaultAddress}`);

  console.log("\n🔵 --- PHASE 2: INJECTING MNEE LIQUIDITY ---");
  const SECRET_SLOT = 51; 
  
  const magicAmount = ethers.parseUnits("1000000", 6);
  await setTokenBalance(MNEE_ADDRESS, vaultAddress, magicAmount, SECRET_SLOT);
  
  const newBalance = await mneeToken.balanceOf(vaultAddress);
  console.log(`💰 Vault Balance: ${ethers.formatUnits(newBalance, 6)} MNEE`);
  console.log(`✅ System Ready.`);
  console.log(`👉 COPY THIS VAULT ADDRESS: ${vaultAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});