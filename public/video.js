(() => {
  function getCallIdFromPath() {
    const match = window.location.pathname.match(/\/video\/([^\/]+)/);
    return match ? match[1] : null;
  }

  function setStatus(msg) {
    const el = document.getElementById('statusPill');
    if (el) el.textContent = msg;
  }

  function setCaller(name) {
    const el = document.getElementById('callerText');
    if (el) el.textContent = name ? `Em chamada com ${name}` : 'Em chamada…';
  }

  async function safePlay(videoEl, overlayEl) {
    try {
      await videoEl.play();
      overlayEl.classList.add('hidden');
      return true;
    } catch {
      overlayEl.classList.remove('hidden');
      return false;
    }
  }

  async function init() {
    const callId = getCallIdFromPath();
    const mainVideo = document.getElementById('mainVideo');
    const overlay = document.getElementById('startOverlay');
    const startBtn = document.getElementById('startBtn');
    const endedOverlay = document.getElementById('endedOverlay');
    const endedBtn = document.getElementById('endedBtn');
    const hangupBtn = document.getElementById('hangupBtn');
    const cameraBtn = document.getElementById('cameraBtn');
    const selfWrap = document.getElementById('selfPreviewWrap');
    const selfVideo = document.getElementById('selfPreview');
    let selfStream = null;
    let secondsElapsed = 0;
    let timerInterval = null;

    function startTimer() {
      if (timerInterval) return;
      const timerEl = document.getElementById('timerText');
      timerInterval = setInterval(() => {
        secondsElapsed++;
        const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
        const secs = (secondsElapsed % 60).toString().padStart(2, '0');
        if (timerEl) timerEl.textContent = `${mins}:${secs}`;
      }, 1000);
    }

    if (!callId) {
      setStatus('Call inválida');
      overlay.classList.remove('hidden');
      startBtn.textContent = 'Voltar';
      startBtn.onclick = () => window.location.href = '/';
      return;
    }

    hangupBtn.addEventListener('click', () => {
      if (timerInterval) clearInterval(timerInterval);
      
      // Esconde o vídeo e os controles para não sobrar rastro
      mainVideo.style.display = 'none';
      document.querySelector('.controls').style.display = 'none';
      document.querySelector('.topbar').style.display = 'none';
      document.getElementById('selfPreviewWrap').style.display = 'none';

      try {
        mainVideo.pause();
        mainVideo.src = "";
        mainVideo.load();
      } catch {}

      try {
        if (selfStream) selfStream.getTracks().forEach(t => t.stop());
      } catch {}

      setStatus('Encerrada');
      endedOverlay.classList.remove('hidden');
    });

    startBtn.addEventListener('click', async () => {
      const ok = await safePlay(mainVideo, overlay);
      if (ok) startTimer();
    });

    const muteBtn = document.getElementById('muteBtn');
    let muted = false;

    muteBtn?.addEventListener('click', () => {
      muted = !muted;
      muteBtn.classList.toggle('btn-active', muted);
      const label = muteBtn.querySelector('.btn-label');
      if (label) label.textContent = muted ? 'Mudo' : 'Voz';
    });

    cameraBtn.addEventListener('click', async () => {
      const label = cameraBtn.querySelector('.btn-label');
      if (selfStream) {
        // Desligar câmera
        try {
          selfStream.getTracks().forEach(t => t.stop());
          selfStream = null;
          selfVideo.srcObject = null;
          selfWrap.style.display = 'none';
          if (label) label.textContent = 'Vídeo';
          cameraBtn.classList.remove('btn-active');
        } catch (e) {
          console.error('Erro ao desligar câmera:', e);
        }
      } else {
        // Ligar câmera
        if (label) label.textContent = 'Ativando...';
        try {
          selfStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          selfVideo.srcObject = selfStream;
          selfWrap.style.display = 'block';
          if (label) label.textContent = 'Vídeo';
          cameraBtn.classList.add('btn-active');
        } catch (e) {
          console.error('Erro ao ligar câmera:', e);
          if (label) label.textContent = 'Vídeo';
          alert('Não foi possível acessar a câmera. Verifique as permissões.');
        }
      }
    });

    endedBtn?.addEventListener('click', () => {
      // Encerrar por completo: tenta fechar a aba. Se o browser bloquear, manda pra Home.
      try {
        window.close();
      } catch {}
      setTimeout(() => {
        if (!window.closed) window.location.href = '/';
      }, 200);
    });

    setStatus('Carregando...');

    try {
      const resp = await fetch(`/api/call/${encodeURIComponent(callId)}`);
      const data = await resp.json();
      if (!resp.ok) {
        setStatus('Call não encontrada');
        overlay.classList.remove('hidden');
        startBtn.textContent = 'Voltar';
        startBtn.onclick = () => window.location.href = '/';
        return;
      }

      setCaller(data.callerName || 'Bia');
      setStatus('Conectado');

      mainVideo.src = data.videoUrl;
      mainVideo.playsInline = true;

      // Quando o vídeo acabar, encerra a chamada automaticamente
      mainVideo.onended = () => {
        hangupBtn.click();
      };

      // tenta autoplay (pode falhar por política do navegador)
      const ok = await safePlay(mainVideo, overlay);
      if (ok) startTimer();

      mainVideo.addEventListener('error', () => {
        setStatus('Erro ao carregar vídeo');
        overlay.classList.remove('hidden');
        document.querySelector('.overlay-sub').textContent = 'Não foi possível carregar o vídeo dessa call.';
        startBtn.textContent = 'Voltar';
        startBtn.onclick = () => window.location.href = '/';
      });
    } catch {
      setStatus('Erro de rede');
      overlay.classList.remove('hidden');
      startBtn.textContent = 'Tentar novamente';
      startBtn.onclick = () => window.location.reload();
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();


