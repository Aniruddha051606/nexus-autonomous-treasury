import { ethers } from "hardhat";
import chokidar from "chokidar";
import fs from "fs";
import https from "https"; // Native module (Unbreakable)

// ⚠️ PASTE YOUR VAULT ADDRESS FROM THE GOD MODE OUTPUT HERE
const VAULT_ADDRESS = "0xe1fC830Bf20308cBBa2B248C543E305b979A64Ec"; // <--- UPDATE THIS AFTER DEPLOYMENT
const MNEE_ADDRESS = "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF";

// YOUR WEBHOOK
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1443669539463102638/t-2iPrwxhY00PKMv1drQt1BSGEdUQoQmKc4iWCw9RyyO-SAGC0w8mo03NpBFMJ1AW753";

async function main() {
  console.log("------------------------------------------------");
  console.log("🤖 NEXUS AGENT: ONLINE");
  console.log("👀 Watching /invoices folder...");
  console.log("------------------------------------------------");

  sendNotification("Nexus System", "ONLINE", "Startup Check");

  // Connect to Localhost
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const signer = await provider.getSigner(1); 
  
  const NexusVault = await ethers.getContractAt("NexusVault", VAULT_ADDRESS, signer);

  const watcher = chokidar.watch("./invoices", {
    ignored: /(^|[\/\\])\../, 
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 }
  });

  watcher.on("add", async (filePath) => {
    console.log(`\n📄 NEW INVOICE DETECTED: ${filePath}`);
    await processInvoice(filePath, NexusVault);
  });
}

function sendNotification(service: string, amount: string, txHash: string) {
  const postData = JSON.stringify({
    username: "Nexus Treasury",
    embeds: [{
      title: "✅ PAYMENT EXECUTED",
      color: 5763719, 
      fields: [
        { name: "Vendor", value: service, inline: true },
        { name: "Amount", value: `$${amount} MNEE`, inline: true },
        { name: "Tx Hash", value: `\`${txHash.substring(0, 10)}...\`` }
      ],
      timestamp: new Date().toISOString()
    }]
  });

  const url = new URL(DISCORD_WEBHOOK);
  const req = https.request({
    hostname: url.hostname, port: 443, path: url.pathname, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
  }, (res) => {
    if (res.statusCode === 204) console.log("🔔 Discord Notification Sent!");
  });
  req.on('error', (e) => console.error(`❌ Network Error: ${e.message}`));
  req.write(postData);
  req.end();
}

async function processInvoice(filePath: string, vault: any) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    if (!content) return;
    const data = JSON.parse(content);

    // Fallback Address if missing in JSON
    const PAY_TO = data.recipient || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; 

    console.log(`🔍 ANALYZING: Paying ${data.amount} MNEE to ${PAY_TO}`);
    const amountWei = ethers.parseUnits(data.amount.toString(), 6);
    
    console.log("💸 SENDING TRANSACTION...");
    const tx = await vault.payInvoice(PAY_TO, amountWei, "INV-" + Date.now());
    console.log(`⏳ Pending: ${tx.hash}`);
    await tx.wait();
    
    console.log(`🎉 SUCCESS!`);
    sendNotification(data.service || "Unknown", data.amount, tx.hash);

  } catch (error) {
    console.error("❌ ERROR:", error);
  }
}

main().catch((error) => console.error(error));