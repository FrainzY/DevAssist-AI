import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_INSTRUCTION = `Kamu adalah devAsisst AI, Developer Copilot yang ramah, teliti, dan berbahasa Indonesia.

Fokus:
- Belajar pemrograman
- Debugging dan penjelasan kode
- Contoh kode dan latihan bertahap
- Penilaian jawaban
- Roadmap belajar
- Membantu pengguna memahami solusi teknis

Aturan:
- Utamakan konteks percakapan yang diberikan.
- Jangan mengarang detail kode, error, versi library, atau hasil eksekusi.
- Jika konteks kurang, jelaskan asumsi dan tanyakan informasi yang diperlukan.
- Saat debugging, jelaskan kemungkinan penyebab, bukti dari pesan error, langkah pemeriksaan, solusi, dan cara mengujinya.
- Sesuaikan penjelasan dengan kemampuan pengguna.
- Jangan langsung memberikan jawaban penuh untuk latihan kecuali diminta; berikan petunjuk bertahap.
- Gunakan Markdown dan code fence dengan label bahasa.
- Hindari jawaban yang bertele-tele.
- Jika diminta roadmap, susun tahapan, tujuan, proyek mini, dan kriteria selesai.
- Jika menilai jawaban, berikan skor, alasan, koreksi, dan saran perbaikan.
- Jangan mengklaim telah menjalankan kode atau mengingat percakapan di luar konteks yang diberikan aplikasi.
- Gunakan hanya informasi yang tersedia dalam percakapan.

Gaya: suportif, jelas, praktis, dan tidak menghakimi.`;

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    model: MODEL,
    configured: Boolean(ai),
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error:
          'API key belum dikonfigurasi. Periksa kembali isi GEMINI_API_KEY pada file .env.',
      });
    }

    const message = String(req.body.message || '').trim();

    if (!message) {
      return res.status(400).json({
        error: 'Tulis pesan terlebih dahulu.',
      });
    }

    let history = [];
    const rawHistory = req.body.history;

    if (Array.isArray(rawHistory)) {
      history = rawHistory;
    } else if (typeof rawHistory === 'string') {
      try {
        const parsedHistory = JSON.parse(rawHistory);

        if (Array.isArray(parsedHistory)) {
          history = parsedHistory;
        }
      } catch {
        return res.status(400).json({
          error: 'Format riwayat percakapan tidak valid.',
        });
      }
    }

    // Ambil maksimal 16 pesan terakhir.
    const recentHistory = history.slice(-16).map((item) => ({
      role: item.role === 'model' ? 'model' : 'user',
      parts: [
        {
          text: String(item.text || '').slice(0, 12000),
        },
      ],
    }));

    const contents = [
      ...recentHistory,
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    const result = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.35,
        topP: 0.9,
        maxOutputTokens: 4096,
      },
    });

    const answer = result.text?.trim();

    if (!answer) {
      return res.status(502).json({
        error:
          'Model tidak mengembalikan teks. Coba kirim ulang dengan instruksi yang lebih spesifik.',
      });
    }

    return res.json({
      answer,
      model: MODEL,
    });
  } catch (error) {
    console.error('Gemini request failed:', error);

    const status = Number(error?.status) || 500;
    const safeStatus = status >= 400 && status < 600 ? status : 500;

    let message = 'Terjadi kesalahan saat memproses permintaan. Coba lagi.';

    if (safeStatus === 429) {
      message = 'Batas penggunaan API tercapai. Tunggu sebentar lalu coba lagi.';
    } else if (safeStatus === 400) {
      message = 'Permintaan tidak dapat diproses. Periksa format pesan.';
    } else if (safeStatus === 401 || safeStatus === 403) {
      message = 'API key tidak valid atau belum memiliki akses ke model.';
    }

    return res.status(safeStatus).json({ error: message });
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  return res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`devAsisst AI berjalan di http://localhost:${PORT}`);

  if (!ai) {
    console.warn('GEMINI_API_KEY belum diatur. Periksa kembali isi file .env');
  }
});
