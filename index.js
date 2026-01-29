import makeWASocket, {
  useMultiFileAuthState,
  downloadMediaMessage
} from "@whiskeysockets/baileys";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import { config } from "./config.js";
import fs from "fs";

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.buttonsResponseMessage?.selectedButtonId;

    await sock.readMessages([msg.key]);

    // =========================
    // MENU UTAMA
    // =========================
    if (text === `${config.prefix}menu`) {
      await sock.sendMessage(jid, {
        text: `🤖 *${config.botName}*\nSelect feature:`,
        buttons: [
          { buttonId: "feature_general", buttonText: { displayText: "📚 General" }, type: 1 },
          { buttonId: "feature_ai", buttonText: { displayText: "🤖 AI" }, type: 1 },
          { buttonId: "feature_media", buttonText: { displayText: "🖼️ Media" }, type: 1 },
          { buttonId: "feature_admin", buttonText: { displayText: "⚙️ Admin" }, type: 1 }
        ],
        headerType: 1
      });
      return;
    }

    // =========================
    // MEDIA MENU
    // =========================
    if (text === "feature_media") {
      await sock.sendMessage(jid, {
        text: "🖼️ *Media Features*",
        buttons: [
          { buttonId: "media_sticker", buttonText: { displayText: "📸 Foto → Stiker" }, type: 1 },
          { buttonId: "media_image", buttonText: { displayText: "🧩 Stiker → Foto" }, type: 1 }
        ],
        headerType: 1
      });
      return;
    }

    // =========================
    // FOTO → STIKER
    // =========================
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

      await sock.sendMessage(jid, {
        sticker: sticker
      });
      return;
    }

    // =========================
    // STIKER → FOTO
    // =========================
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
        image: image,
        caption: "Ini fotonya 🖼️"
      });
      return;
    }
  });
}

startBot();
