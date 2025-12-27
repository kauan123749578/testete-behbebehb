(() => {
  function getCallIdFromPath() {
    const match = window.location.pathname.match(/\/ring\/([^\/]+)/);
    return match ? match[1] : null;
  }

  function initials(name) {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return '?';
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
    return (first + last).toUpperCase() || '?';
  }

  function setError(msg) {
    const el = document.getElementById('error');
    el.style.display = 'block';
    el.textContent = msg;
  }

  async function load() {
    const callId = getCallIdFromPath();
    if (!callId) {
      setError('Call ID não encontrado na URL.');
      return;
    }

    const acceptBtn = document.getElementById('acceptBtn');
    const declineBtn = document.getElementById('declineBtn');

    acceptBtn.addEventListener('click', () => {
      // Vai para a “chamada” com vídeo
      window.location.href = `/video/${encodeURIComponent(callId)}`;
    });

    declineBtn.addEventListener('click', () => {
      declineBtn.disabled = true;
      acceptBtn.disabled = true;
      const title = document.getElementById('callerName');
      const sub = document.querySelector('.subtitle');
      if (title) title.textContent = 'Chamada recusada';
      if (sub) sub.textContent = 'Você recusou a chamada.';
    });

    try {
      const resp = await fetch(`/api/call/${encodeURIComponent(callId)}`);
      const data = await resp.json();
      if (!resp.ok) {
        setError(data?.error || 'Não foi possível carregar a call.');
        return;
      }

      const name = data.callerName || 'Bia';
      document.getElementById('callerName').textContent = name;
      document.getElementById('callerName2').textContent = name;

      const fallback = document.getElementById('avatarFallback');
      fallback.textContent = initials(name);

      const avatarImg = document.getElementById('avatarImg');
      if (data.callerAvatarUrl) {
        avatarImg.src = data.callerAvatarUrl;
        avatarImg.onload = () => {
          avatarImg.style.display = 'block';
          fallback.style.display = 'none';
        };
        avatarImg.onerror = () => {
          avatarImg.style.display = 'none';
          fallback.style.display = 'grid';
        };
      }
    } catch (e) {
      setError('Erro ao carregar informações da call.');
    }
  }

  window.addEventListener('DOMContentLoaded', load);
})();


