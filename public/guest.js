// Guest: carrega vídeo local + recebe áudio via WebRTC
class GuestController {
    constructor() {
        this.callId = null;
        this.ws = null;
        this.peerConnection = null;
        this.videoUrl = null;
        this.hostId = null;
        this.videoStarted = false;
        
        this.init();
    }

    init() {
        // Extrai callId da URL
        const path = window.location.pathname;
        const match = path.match(/\/call\/([^\/]+)/);
        if (!match) {
            alert('Call ID não encontrado na URL');
            return;
        }

        this.callId = match[1];
        this.loadCallInfo();
    }

    async loadCallInfo() {
        try {
            const response = await fetch(`/api/call/${this.callId}`);
            const data = await response.json();

            if (response.ok) {
                this.videoUrl = data.videoUrl;
                this.connectWebSocket();
            } else {
                alert('Call não encontrada');
            }
        } catch (error) {
            console.error('Erro ao carregar call:', error);
            alert('Erro ao carregar informações da call');
        }
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        this.ws = new WebSocket(wsUrl);
        const clientId = this.generateId();

        this.ws.onopen = () => {
            this.ws.send(JSON.stringify({
                type: 'join',
                callId: this.callId,
                role: 'guest',
                clientId
            }));
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleSignaling(data);
        };

        this.ws.onerror = () => {
            this.updateStatus('Erro na conexão', false);
        };

        this.ws.onclose = () => {
            this.updateStatus('Desconectado', false);
        };
    }

    handleSignaling(data) {
        switch (data.type) {
            case 'joined':
                console.log('Guest conectado à sala');
                this.updateStatus('Aguardando host...', false);
                break;

            case 'host-joined':
                this.updateStatus('Host conectado', true);
                break;

            case 'host-left':
                this.updateStatus('Host desconectado', false);
                break;

            case 'offer':
                this.handleOffer(data.offer, data.hostId);
                break;

            case 'ice-candidate':
                this.handleIceCandidate(data.candidate);
                break;

            case 'play':
                this.startVideo();
                break;
        }
    }

    async handleOffer(offer, hostId) {
        this.hostId = hostId;
        this.updateStatus('Conectando áudio...', true);

        // Cria RTCPeerConnection
        this.peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        // Recebe áudio remoto
        this.peerConnection.ontrack = (event) => {
            const remoteAudio = document.getElementById('remoteAudio');
            remoteAudio.srcObject = event.streams[0];
            this.updateStatus('Áudio conectado', true);
            
            // Quando áudio estiver pronto, sinaliza para iniciar vídeo
            if (!this.videoStarted) {
                this.ws.send(JSON.stringify({
                    type: 'ready',
                    callId: this.callId
                }));
            }
        };

        // Lida com ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.ws.send(JSON.stringify({
                    type: 'ice-candidate',
                    callId: this.callId,
                    candidate: event.candidate
                }));
            }
        };

        // Define remote description
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        // Cria answer
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.ws.send(JSON.stringify({
            type: 'answer',
            callId: this.callId,
            answer: answer
        }));
    }

    handleIceCandidate(candidate) {
        if (this.peerConnection) {
            this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }

    startVideo() {
        if (this.videoStarted) return;
        this.videoStarted = true;

        const video = document.getElementById('video');
        const loading = document.getElementById('loading');

        video.src = this.videoUrl;
        video.load();

        video.onloadeddata = () => {
            loading.classList.add('hidden');
            video.classList.remove('hidden');
            this.updateStatus('Reproduzindo', true);
        };

        video.onerror = () => {
            loading.innerHTML = '<p style="color: red;">Erro ao carregar vídeo</p>';
        };
    }

    updateStatus(message, connected) {
        const statusEl = document.getElementById('status');
        statusEl.textContent = message;
        statusEl.className = 'status' + (connected ? ' connected' : '');
    }

    generateId() {
        return Math.random().toString(36).substring(2, 15);
    }
}

// Inicializa quando a página carrega
window.addEventListener('DOMContentLoaded', () => {
    new GuestController();
});

