import { ethers } from "hardhat";
import chokidar from "chokidar";
import fs from "fs";
import twilio from "twilio"; // <--- New Import

// --- CONFIGURATION ---
const VAULT_ADDRESS = "0xd31d3e1F60552ba8B35aA3Bd17c949404fdd12c4"; 
const MNEE_ADDRESS = "0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF";

// --- TWILIO CONFIG (GET FROM DASHBOARD) ---
// BAD: const accountSid = "AC1234567890abcdef...";
// GOOD:
const accountSid = process.env.TWILIO_ACCOUNT_SID || "YOUR_TWILIO_SID";
const AUTH_TOKEN = "83a3db2fd864569364f7d21aefa21145";   // Paste Token
const FROM_NUM = "whatsapp:+14155238886";            // Twilio Sandbox Number
const TO_NUM = "whatsapp:+917420851396";             // YOUR Phone Number

const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

async function main() {
  console.log("------------------------------------------------");
  console.log("🤖 NEXUS AGENT: ONLINE (WHATSAPP MODE)");
  console.log("👀 Watching /invoices folder...");
  console.log("------------------------------------------------");

  // Send Startup Ping
  sendWhatsApp(`🤖 *Nexus System Online*\nReady to process MNEE payments.`);

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

// --- WHATSAPP NOTIFICATION FUNCTION ---
async function sendWhatsApp(message: string) {
  try {
    await client.messages.create({
        body: message,
        from: FROM_NUM,
        to: TO_NUM
    });
    console.log("📱 WhatsApp Sent!");
  } catch (e) {
    console.log("❌ WhatsApp Failed (Check Credentials)");
  }
}

async function processInvoice(filePath: string, vault: any) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    if (!content) return;
    const data = JSON.parse(content);

    console.log(`🔍 ANALYZING: Paying ${data.amount} MNEE...`);
    const amountWei = ethers.parseUnits(data.amount.toString(), 6);
    
    console.log("💸 SENDING TRANSACTION...");
    const tx = await vault.payInvoice(data.recipient, amountWei, "INV-" + Date.now());
    console.log(`⏳ Pending: ${tx.hash}`);
    await tx.wait();
    
    console.log(`🎉 SUCCESS!`);
    
    // FORMATTED WHATSAPP MESSAGE
    const msg = `✅ *INVOICE PAID AUTOMATICALLY*\n\n` +
                `🏢 *Vendor:* ${data.service || "Unknown"}\n` +
                `💰 *Amount:* $${data.amount} MNEE\n` +
                `🔗 *Tx Hash:* ${tx.hash.substring(0, 8)}...`;

    await sendWhatsApp(msg);

  } catch (error) {
    console.error("❌ ERROR:", error);
  }
}

main().catch((error) => console.error(error));