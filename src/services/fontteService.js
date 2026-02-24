import { cleanPhoneNumber } from "../utils/waHelper";

const FONNTE_TOKEN = import.meta.env.VITE_FONNTE_TOKEN;
const FONNTE_URL = "https://api.fonnte.com/send";

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timeout setelah ${ms / 1000} detik`)),
        ms,
      ),
    ),
  ]);

export const sendWAMessage = async (phone, message, imageUrl = null) => {
  const cleanPhone = cleanPhoneNumber(phone);

  if (!cleanPhone) {
    return { success: false, error: "Nomor telepon tidak valid" };
  }

  if (!FONNTE_TOKEN) {
    return { success: false, error: "Token Fonnte belum dikonfigurasi" };
  }

  try {
    const response = await withTimeout(
      fetch(FONNTE_URL, {
        method: "POST",
        headers: {
          Authorization: FONNTE_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: cleanPhone,
          message: message,
          delay: "2",
          countryCode: "62",
          ...(imageUrl && { url: imageUrl }),
        }),
      }),
      15000,
      "Kirim WA",
    );

    const data = await response.json();

    if (data.status) {
      return { success: true, target: cleanPhone };
    }
    return {
      success: false,
      error: data.reason || "Fonnte menolak pengiriman",
    };
  } catch (err) {
    return {
      success: false,
      error: err.message.includes("timeout")
        ? "Koneksi timeout — coba lagi"
        : err.message,
    };
  }
};
