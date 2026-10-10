# devAsisst AI — Developer Copilot

Chatbot AI untuk membantu developer belajar pemrograman, memahami kode, dan melakukan debugging. Dibangun menggunakan **Node.js, Express, Vanilla JavaScript, dan Gemini API** dengan antarmuka dark violet yang responsif.

## Fitur

- **AI Chat:** Berinteraksi dengan Gemini API untuk bertanya seputar pemrograman dan debugging.
- **Konteks Percakapan:** Mengirim riwayat percakapan sebagai konteks agar respons AI tetap relevan.
- **Developer Tools:** Membantu memahami kode, menganalisis pesan error, menyusun roadmap belajar, dan membuat latihan pemrograman.
- **Catatan Solusi:** Menyimpan jawaban AI sebagai referensi yang dapat dibuka kembali.
- **Penyimpanan Lokal:** Menyimpan catatan solusi di browser menggunakan `localStorage`.
- **Responsive UI:** Tampilan menyesuaikan ukuran layar desktop maupun perangkat mobile.

## Teknologi

- Node.js
- Express.js
- Vanilla JavaScript
- HTML5 dan CSS3
- Google Gemini API
- Google AI Studio

## Persyaratan

- Node.js 20 atau lebih baru.
- API key Gemini dari [Google AI Studio](https://aistudio.google.com/apikey).
- Koneksi internet untuk mengakses Gemini API.

## Menjalankan Aplikasi

1. Ekstrak ZIP dan buka terminal di folder proyek `devAssist-AI`.

2. Install dependency:

   ```bash
   npm install
   ```

3. Buat file `.env`, lalu isi konfigurasi seperti berikut:

   ```env
   GEMINI_API_KEY=API_KEY_ANDA
   PORT=3000
   GEMINI_MODEL=gemini-3.8-flash
   ```

   Ganti `API_KEY_ANDA` dengan API key milik Anda.

   **Penting:** Jangan membagikan file `.env` atau mengunggah API key ke repositori publik. Pastikan file `.env` tercantum di `.gitignore`.

4. Jalankan server:

   ```bash
   npm start
   ```

   Untuk mode pengembangan dengan restart otomatis, jika tersedia di `package.json`:

   ```bash
   npm run dev
   ```

5. Buka aplikasi melalui browser:

   [http://localhost:3000](http://localhost:3000)

   Jangan membuka file HTML secara langsung menggunakan `file://`, karena aplikasi perlu dijalankan melalui server Express.

## Struktur Folder

```text
devAssist-AI/
├── public/
│   ├── html/
│   │   └── index.html
│   └── assets/
│       ├── css/
│       │   └── style.css
│       └── js/
│           └── app.js
├── .gitignore
├── .prettierrc
├── index.js
├── package.json
└── README.md
```

File `.env` dibuat secara manual dan tidak disertakan dalam ZIP untuk melindungi API key.

## Cara Kerja

1. Pengguna memasukkan pertanyaan atau masalah pemrograman melalui antarmuka chat.
2. Frontend mengirim pesan dan riwayat percakapan ke backend Express melalui endpoint `/api/chat`.
3. Backend meneruskan permintaan ke Gemini API menggunakan model yang dikonfigurasi.
4. Respons AI dikirim kembali ke frontend dan ditampilkan dalam percakapan.
5. Pengguna dapat menyimpan jawaban yang bermanfaat sebagai catatan solusi.

Tombol **Percakapan Baru** digunakan untuk memulai percakapan dari awal dan membersihkan konteks chat aktif.

Untuk hasil debugging yang lebih baik, sertakan kode yang relevan, pesan error lengkap, langkah reproduksi, serta versi runtime atau library yang digunakan.

## Penyimpanan Data

Catatan solusi disimpan menggunakan `localStorage` pada browser.

Data bersifat lokal pada browser dan perangkat yang digunakan. Data tidak otomatis tersinkronisasi dengan perangkat lain dan dapat hilang jika penyimpanan browser dihapus.

## REST API

| Method | Endpoint      | Deskripsi                                            |
| ------ | ------------- | ---------------------------------------------------- |
| GET    | `/api/health` | Memeriksa status server dan konfigurasi API.         |
| POST   | `/api/chat`   | Mengirim pesan dan riwayat percakapan ke Gemini API. |

Endpoint `/api/chat` menerima data percakapan dan riwayat sesuai format yang ditangani backend. Jika fitur upload file diaktifkan, endpoint ini juga dapat menerima lampiran melalui `multipart/form-data`.

## Konfigurasi Model

Model default ditentukan melalui variabel lingkungan `GEMINI_MODEL`.

```env
GEMINI_MODEL=gemini-3.8-flash
```

Model dapat diganti dengan model Gemini lain yang tersedia dan kompatibel dengan implementasi API yang digunakan.

Ketersediaan model, kuota, dan batas penggunaan mengikuti kebijakan Google. Periksa dokumentasi resmi untuk informasi terbaru:

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)

## Troubleshooting

- **API key belum dikonfigurasi:** Pastikan file `.env` tersedia di root proyek dan berisi `GEMINI_API_KEY` yang valid. Restart server setelah mengubah konfigurasi.
- **Error 401 atau 403:** Periksa validitas API key dan izin akses model.
- **Error 404:** Pastikan nama model tersedia dan didukung oleh API yang digunakan.
- **Error 429:** Periksa kuota dan rate limit, lalu coba kembali setelah batas penggunaan tersedia.
- **Aplikasi tidak dapat dibuka:** Pastikan server berjalan dan kunjungi `http://localhost:3000`.
- **Respons AI gagal:** Periksa terminal backend untuk melihat pesan error dan pastikan koneksi internet tersedia.
