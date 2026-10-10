const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const STORAGE = {
  notes: 'devassist.notes.v1',
};

const state = {
  history: [],
  busy: false,
  mode: 'chat',
  lastAnswer: '',
  notes: readStore(STORAGE.notes, []),
};

function readStore(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value = '') {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]
  );
}
function markdownToHtml(input) {
  // Render subset Markdown without allowing model output to inject arbitrary HTML.
  let text = escapeHtml(input);
  const blocks = [];
  text = text.replace(/```([\w+-]*)\n?([\s\S]*?)```/g, (_m, lang, code) => {
    const index = blocks.push(`<pre><code>${code.trim()}</code></pre>`) - 1;
    return `@@BLOCK${index}@@`;
  });
  text = text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^ )]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
  text = text.replace(/(?:^|\n)([-*] .+(?:\n[-*] .+)*)/g, (match) => {
    const items = match
      .trim()
      .split('\n')
      .map((line) => `<li>${line.replace(/^[-*] /, '')}</li>`)
      .join('');
    return `\n<ul>${items}</ul>`;
  });
  text = text.replace(/(?:^|\n)(\d+\. .+(?:\n\d+\. .+)*)/g, (match) => {
    const items = match
      .trim()
      .split('\n')
      .map((line) => `<li>${line.replace(/^\d+\. /, '')}</li>`)
      .join('');
    return `\n<ol>${items}</ol>`;
  });
  text = text
    .split(/\n{2,}/)
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed || /^@@BLOCK\d+@@$/.test(trimmed) || /^<(h[1-3]|ul|ol|pre)/.test(trimmed))
        return trimmed;
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
  return text.replace(/@@BLOCK(\d+)@@/g, (_m, index) => blocks[Number(index)] || '');
}
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function setMode(mode) {
  state.mode = mode;

  const titles = {
    chat: 'Chat & Debugging',
    roadmap: 'Susun roadmap',
    practice: 'Latihan coding',
    review: 'Nilai jawaban',
  };

  $('#mode-title').textContent = titles[mode] || titles.chat;

  $$('.nav-item[data-mode]').forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === mode);
  });

  $('#message-input').placeholder =
    {
      roadmap: 'Ceritakan target belajar atau karier yang ingin kamu capai...',
      practice: 'Sebutkan topik yang ingin dilatih atau kirim jawabanmu...',
      review: 'Tempel soal, kriteria, dan jawaban yang ingin dinilai...',
    }[mode] || 'Tanyakan sesuatu tentang kode, error, atau konsep pemrograman...';

  $('#sidebar').classList.remove('open');
}

function renderMessage(role, text, { pending = false } = {}) {
  $('#welcome').hidden = true;
  $('#messages').hidden = false;
  const wrapper = document.createElement('article');
  wrapper.className = `message ${role === 'user' ? 'user' : 'assistant'}`;
  if (pending) {
    wrapper.id = 'pending-message';
    wrapper.innerHTML = `<div class="message-avatar">da</div><div class="message-body"><div class="message-meta">devAsisst AI · sedang berpikir</div><div class="message-bubble"><div class="typing"><span></span><span></span><span></span></div></div></div>`;
  } else {
    const safe = role === 'user' ? escapeHtml(text).replace(/\n/g, '<br>') : markdownToHtml(text);
    wrapper.innerHTML = `<div class="message-avatar">${role === 'user' ? 'you' : 'da'}</div><div class="message-body"><div class="message-meta">${role === 'user' ? 'Kamu' : 'devAsisst AI'}</div><div class="message-bubble">${safe}</div>${role === 'model' ? '<div class="message-actions"><button data-action="save">▤ Simpan solusi</button><button data-action="copy">⧉ Salin jawaban</button></div>' : ''}</div>`;
    if (role === 'model') {
      wrapper.querySelector('[data-action="save"]').addEventListener('click', () => saveNote(text));
      wrapper.querySelector('[data-action="copy"]').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(text);
          showToast('Jawaban disalin.');
        } catch {
          showToast('Clipboard tidak tersedia di browser ini.');
        }
      });
    }
  }
  $('#messages').append(wrapper);
  $('#messages').scrollTop = $('#messages').scrollHeight;
  wrapper.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  return wrapper;
}

function startNewChat() {
  state.history = [];
  state.lastAnswer = '';

  $('#messages').replaceChildren();
  $('#messages').hidden = true;
  $('#welcome').hidden = false;

  $('#message-input').value = '';
  $('#message-input').style.height = 'auto';

  setMode('chat');
  $('#message-input').focus();
}

function updateStats() {
  $('#notes-count').textContent = state.notes.length;
}

function saveNote(content = state.lastAnswer) {
  if (!content?.trim()) return showToast('Belum ada jawaban untuk disimpan.');
  const title =
    content
      .split('\n')
      .find((line) => line.trim())
      ?.replace(/^#+\s*/, '')
      .slice(0, 72) || 'Solusi debugging';
  state.notes.unshift({ id: crypto.randomUUID(), title, content, date: new Date().toISOString() });
  writeStore(STORAGE.notes, state.notes);
  updateStats();
  showToast('Solusi disimpan ke catatan lokal.');
}
function renderNotesModal() {
  $('#modal-kicker').textContent = 'DEBUGGING KNOWLEDGE';
  $('#modal-title').textContent = 'Catatan solusi';
  const content = $('#modal-content');
  if (!state.notes.length) {
    content.innerHTML =
      '<div class="modal-empty">Belum ada solusi tersimpan.<br>Simpan jawaban AI dari percakapan untuk membangun kumpulan referensimu.</div>';
    return;
  }
  content.innerHTML = state.notes
    .map(
      (note) =>
        `<article class="modal-item"><h3>${escapeHtml(note.title)}</h3><p>${escapeHtml(note.content.slice(0, 340))}${note.content.length > 340 ? '…' : ''}</p><div class="modal-item-actions"><button data-open-note="${note.id}">Lihat lengkap</button><button data-delete-note="${note.id}">Hapus</button></div></article>`
    )
    .join('');
  content.querySelectorAll('[data-open-note]').forEach((button) =>
    button.addEventListener('click', () => {
      const note = state.notes.find((item) => item.id === button.dataset.openNote);
      if (note) {
        $('#modal-title').textContent = note.title;
        content.innerHTML = `<article class="modal-item"><p>${escapeHtml(note.content)}</p><div class="modal-item-actions"><button id="copy-note">Salin catatan</button><button id="back-notes">Kembali</button></div></article>`;
        $('#copy-note').addEventListener('click', async () => {
          await navigator.clipboard.writeText(note.content);
          showToast('Catatan disalin.');
        });
        $('#back-notes').addEventListener('click', renderNotesModal);
      }
    })
  );
  content.querySelectorAll('[data-delete-note]').forEach((button) =>
    button.addEventListener('click', () => {
      state.notes = state.notes.filter((item) => item.id !== button.dataset.deleteNote);
      writeStore(STORAGE.notes, state.notes);
      updateStats();
      renderNotesModal();
      showToast('Catatan dihapus.');
    })
  );
}

function openModal(kind) {
  if (kind !== 'notes') return;

  $('#modal-backdrop').hidden = false;
  renderNotesModal();
}

function closeModal() {
  $('#modal-backdrop').hidden = true;
}
async function sendMessage(prefilled = null) {
  if (state.busy) return;

  const input = $('#message-input');
  const message = (prefilled ?? input.value).trim();

  if (!message) return;

  let prompt = message;

  if (state.mode === 'roadmap') {
    prompt = `[MODE: ROADMAP BELAJAR]
Bantu saya merancang roadmap belajar dengan tujuan, tahapan,
proyek mini, estimasi, dan kriteria selesai.
Jangan mengasumsikan waktu atau kemampuan yang belum saya sebutkan.

${message}`;
  }

  if (state.mode === 'practice') {
    prompt = `[MODE: LATIHAN CODING]
Buat atau lanjutkan latihan coding yang sesuai dengan topik
yang saya minta. Mulai dari satu latihan, sertakan tujuan
dan kriteria penilaian, serta berikan petunjuk terlebih dahulu.
Jangan berikan solusi penuh sebelum saya mencoba.

${message}`;
  }

  if (state.mode === 'review') {
    prompt = `[MODE: MENILAI JAWABAN]
Nilai jawaban saya secara objektif.
Jika soal atau kriteria penilaian belum tersedia, tanyakan dahulu.
Berikan skor, alasan, bagian yang benar, kekurangan,
dan saran perbaikan.

${message}`;
  }

  renderMessage('user', message);

  input.value = '';
  input.style.height = 'auto';

  state.busy = true;
  $('#send-button').disabled = true;

  const pending = renderMessage('model', '', { pending: true });

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: prompt,
        history: state.history,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || `Request gagal (${response.status}).`);
    }

    const answer = result.answer || 'Maaf, belum ada jawaban. Coba kirim ulang.';

    pending.remove();
    renderMessage('model', answer);

    state.history.push({ role: 'user', text: prompt }, { role: 'model', text: answer });

    // Batasi riwayat konteks agar tidak terus bertambah.
    state.history = state.history.slice(-20);
    state.lastAnswer = answer;
  } catch (error) {
    pending.remove();

    renderMessage(
      'model',
      `**Permintaan gagal.** ${error.message}

Periksa koneksi, konfigurasi API key di .env, dan status server.
Pesan yang gagal tidak ditambahkan ke riwayat konteks.`
    );
  } finally {
    state.busy = false;
    $('#send-button').disabled = false;
    input.focus();
  }
}

$('#chat-form').addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage();
});

$('#message-input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

$('#message-input').addEventListener('input', (event) => {
  event.target.style.height = 'auto';
  event.target.style.height = `${Math.min(event.target.scrollHeight, 180)}px`;
});

$('#new-chat').addEventListener('click', startNewChat);

$('#clear-chat').addEventListener('click', () => {
  if (!state.history.length) {
    return showToast('Percakapan masih kosong.');
  }

  startNewChat();
  showToast('Percakapan aktif dibersihkan.');
});

$$('.nav-item[data-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    setMode(button.dataset.mode);
  });
});

$$('[data-prompt]').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.mode) {
      setMode(button.dataset.mode);
    }

    sendMessage(button.dataset.prompt);
  });
});

$('#save-last').addEventListener('click', () => saveNote());

$('#open-notes').addEventListener('click', () => {
  openModal('notes');
});

$('#close-modal').addEventListener('click', closeModal);

$('#modal-backdrop').addEventListener('click', (event) => {
  if (event.target === $('#modal-backdrop')) {
    closeModal();
  }
});

$('#mobile-menu').addEventListener('click', () => {
  $('#sidebar').classList.toggle('open');
});

// Inisialisasi tampilan.
setMode('chat');
updateStats();

// Periksa konfigurasi API jika endpoint health tersedia.
fetch('/api/health')
  .then((response) => {
    if (!response.ok) {
      throw new Error('Health check gagal.');
    }

    return response.json();
  })
  .then((data) => {
    if (!data.configured) {
      showToast('API key belum diatur. Isi .env lalu mulai ulang server.');
    }
  })
  .catch(() => {
    // Kegagalan health check tidak menghalangi penggunaan UI.
  });
