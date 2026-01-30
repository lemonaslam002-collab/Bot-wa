import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  downloadMediaMessage
} from "@whiskeysockets/baileys";
import readline from "readline";
import sharp from "sharp";
import { config } from "./config.js";

// ===== readline untuk pairing =====
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function startBot() {
  // ===== AUTH =====
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion();

  // ===== SOCKET =====
  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  // ===== LOGIN DENGAN PAIRING CODE =====
  if (!state.creds.registered) {
    rl.question("Masukkan nomor WA (contoh 628xxx): ", async (number) => {
      const code = await sock.requestPairingCode(number);
      console.log("PAIRING CODE:", code);
      rl.close();
    });
  }

  // ===== MESSAGE HANDLER =====
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message  msg.key.fromMe) return;

    const jid = msg.key.remoteJid;

    const text =
      msg.message.conversation 

      msg.message.extendedTextMessage?.text ||
      msg.message.listResponseMessage?.singleSelectReply?.selectedRowId;

    await sock.readMessages([msg.key]);

    // =========================
    // MENU UTAMA (LIST MENU)
    // =========================
    if (text === ${config.prefix}menu) {
      await sock.sendMessage(jid, {
        text: 🤖 *${config.botName}*\nPilih fitur di bawah:,
        footer: "FeatureBot",
        title: "MAIN MENU",
        buttonText: "Buka Menu",
        sections: [
          {
            title: "📚 General",
            rows: [
              { title: "Ping", rowId: "general_ping" },
              { title: "Info Bot", rowId: "general_info" }
            ]
          },
          {
            title: "🖼️ Media",
            rows: [
              { title: "Foto → Stiker", rowId: "media_sticker" },
              { title: "Stiker → Foto", rowId: "media_image" }
            ]
          },
          {
            title: "⚙️ Admin",
            rows: [
              { title: "Owner", rowId: "admin_owner" }
            ]
          }
        ]
      });
      return;
    }

    // =========================
    // GENERAL
    // =========================
    if (text === "general_ping") {
      await sock.sendMessage(jid, { text: "pong 🏓" });
      return;
    }

    if (text === "general_info") {
      await sock.sendMessage(jid, {
        text: "WhatsApp Bot dengan List Menu & Media Converter"
      });
      return;
    }

    // =========================
    // MEDIA
    // =========================
    if (text === "media_sticker") {
      await sock.sendMessage(jid, {
        text: "Kirim foto dengan caption stiker"
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

    if (text === "media_image") {
      await sock.sendMessage(jid, {
        text: "Reply stiker dengan caption foto"
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

    // =========================
    // ADMIN
    // =========================
    if (text === "admin_owner") {
      await sock.sendMessage(jid, {
        text: Owner: ${config.owner}
      });
      return;
    }
  });
}

startBot();
