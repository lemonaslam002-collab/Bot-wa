import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  downloadMediaMessage
} from "@whiskeysockets/baileys";
import readline from "readline";
import sharp from "sharp";
import { config } from "./config.js";

// =========================
// READLINE (PAIRING CODE)
// =========================
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function startBot() {
  // =========================
  // AUTH
  // =========================
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  // =========================
  // SOCKET (INI INTINYA)
  // =========================
  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false
  });

  // simpan session
  sock.ev.on("creds.update", saveCreds);

  // =========================
  // CONNECTION HANDLER (FIX 515)
  // =========================
  sock.ev.on("connection.update", (update) => {
    const { connection } = update;

    if (connection === "open") {
      console.log("✅ Bot connected successfully");
    }

    if (connection === "close") {
      console.log("🔁 Connection closed, restarting...");
      setTimeout(() => startBot(), 3000);
    }
  });

  // =========================
  // PAIRING CODE (LOGIN PERTAMA)
  // =========================
  if (!state.creds.registered) {
    rl.question("Masukkan nomor WA (contoh 628xxx): ", async (number) => {
      const code = await sock.requestPairingCode(number.trim());
      console.log("PAIRING CODE:", code);
      rl.close(); // ⬅️ PENTING biar tidak crash
    });
  }

  // =========================
  // MESSAGE HANDLER
  // =========================
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.buttonsResponseMessage?.selectedButtonId;

    await sock.readMessages([msg.key]);

    // ===== MENU UTAMA =====
    if (text === `${config.prefix}menu`) {
      await sock.sendMessage(jid, {
        text: `🤖 *${config.botName}*\nPilih fitur:`,
        buttons: [
          { buttonId: "feature_general", buttonText: { displayText: "📚 General" }, type: 1 },
          { buttonId: "feature_media", buttonText: { displayText: "🖼️ Media" }, type: 1 },
          { buttonId: "feature_admin", buttonText: { displayText: "⚙️ Admin" }, type: 1 }
        ],
        headerType: 1
      });
      return;
    }

    // ===== GENERAL =====
    if (text === "feature_general") {
      await sock.sendMessage(jid, {
        text: "📚 *General*",
        buttons: [
          { buttonId: "general_ping", buttonText: { displayText: "🏓 Ping" }, type: 1 },
          { buttonId: "general_info", buttonText: { displayText: "ℹ️ Info" }, type: 1 }
        ],
        headerType: 1
      });
      return;
    }

    if (text === "general_ping") {
      await sock.sendMessage(jid, { text: "pong 🏓" });
      return;
    }

    if (text === "general_info") {
      await sock.sendMessage(jid, {
        text: "WhatsApp Bot with Button & Media Feature"
      });
      return;
    }

    // ===== MEDIA =====
    if (text === "feature_media") {
      await sock.sendMessage(jid, {
        text: "🖼️ *Media*",
        buttons: [
          { buttonId: "media_sticker", buttonText: { displayText: "📸 Foto → Stiker" }, type: 1 },
          { buttonId: "media_image", buttonText: { displayText: "🧩 Stiker → Foto" }, type: 1 }
        ],
        headerType: 1
      });
      return;
    }

    // foto → stiker
    if (text === "media_sticker") {
      await sock.sendMessage(jid, {
        text: "Kirim foto dengan caption *stiker*"
      });
      return;
    }

    if (msg.message.imageMessage && text === "stiker") {
      const buffer = await downloadMediaMessage(msg, "buffer");
      const sticker = await sharp(buffer)
        .resize(512, 512, { fit: "contain" })
        .webp()
        .toBuffer();

      await sock.sendMessage(jid, { sticker });
      return;
    }

    // stiker → foto
    if (text === "media_image") {
      await sock.sendMessage(jid, {
        text: "Reply stiker dengan caption *foto*"
      });
      return;
    }

    if (msg.message.stickerMessage && text === "foto") {
      const buffer = await downloadMediaMessage(msg, "buffer");
      const image = await sharp(buffer).png().toBuffer();

      await sock.sendMessage(jid, {
        image,
        caption: "Ini fotonya 🖼️"
      });
      return;
    }

    // ===== ADMIN =====
    if (text === "feature_admin") {
      await sock.sendMessage(jid, {
        text: "⚙️ *Admin*",
        buttons: [
          { buttonId: "admin_owner", buttonText: { displayText: "👤 Owner" }, type: 1 }
        ],
        headerType: 1
      });
      return;
    }

    if (text === "admin_owner") {
      await sock.sendMessage(jid, {
        text: `Owner: ${config.owner}`
      });
      return;
    }
  });
}

// =========================
// START BOT
// =========================
startBot();
