import { ethers } from "hardhat";

async function main() {
  console.log("\n🔵 --- PHASE 1: SETUP ---");
  const [admin, aiAgent, vendor] = await ethers.getSigners();
  console.log(`🤖 AI Agent: ${aiAgent.address}`);

  // 1. MNEE & USDC Addresses
  const MNEE_ADDRESS = "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF";
  const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  
  const mneeToken = await ethers.getContractAt("IERC20", MNEE_ADDRESS);

  // 2. Deploy NexusVault
  console.log("📜 Deploying Vault...");
  const dailyLimit = ethers.parseUnits("10000", 6); // 10,000 MNEE Limit
  const NexusVault = await ethers.getContractFactory("NexusVault");
  const vault = await NexusVault.deploy(aiAgent.address, dailyLimit);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`🏦 NexusVault Deployed at: ${vaultAddress}`);

  console.log("\n🔵 --- PHASE 2: FINDING THE WHALE ---");

  // 3. Find the Uniswap V3 Pool (The Real Whale)
  // We ask the Uniswap Factory: "Where is the MNEE/USDC Pool?"
  const UNISWAP_FACTORY = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const factoryAbi = ["function getPool(address, address, uint24) view returns (address)"];
  const factory = await ethers.getContractAt(factoryAbi, UNISWAP_FACTORY);
  
  // Fee tier 3000 = 0.3% (Standard for most pools)
  const poolAddress = await factory.getPool(MNEE_ADDRESS, USDC_ADDRESS, 3000);
  console.log(`🐳 Found MNEE Whale (Uniswap Pool): ${poolAddress}`);

  // 4. Impersonate the Pool to steal funds
  await ethers.provider.send("hardhat_impersonateAccount", [poolAddress]);
  const whaleSigner = await ethers.getSigner(poolAddress);

  // Give the whale some ETH for gas
  await admin.sendTransaction({ to: poolAddress, value: ethers.parseEther("1.0") });

  console.log("\n🔵 --- PHASE 3: FUNDING VAULT ---");

  // 5. Transfer 500 MNEE to our Vault
  const fundAmount = ethers.parseUnits("500", 6);
  await mneeToken.connect(whaleSigner).transfer(vaultAddress, fundAmount);
  
  console.log(`💰 Vault Funded! New Balance: ${ethers.formatUnits(await mneeToken.balanceOf(vaultAddress), 6)} MNEE`);

  console.log("\n🔵 --- PHASE 4: AI EXECUTION ---");

  // 6. The AI Pays the Invoice
  const invoice = {
    id: "INV-2025-001",
    amount: ethers.parseUnits("150", 6),
    recipient: vendor.address
  };
  
  console.log(`💸 AI is paying ${ethers.formatUnits(invoice.amount, 6)} MNEE to Vendor...`);
  
  await vault.connect(aiAgent).payInvoice(
    invoice.recipient,
    invoice.amount,
    invoice.id
  );

  console.log("\n🔵 --- PHASE 5: SUCCESS ---");
  const vendorBalance = await mneeToken.balanceOf(vendor.address);
  console.log(`✅ Vendor Received: ${ethers.formatUnits(vendorBalance, 6)} MNEE`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});