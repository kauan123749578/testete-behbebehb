// Host WebRTC - Versão Simplificada (apenas áudio ao vivo)
class HostController {
    constructor() {
        this.callId = null;
        this.ws = null;
        this.localStream = null;
        this.peerConnections = new Map(); // guestId -> RTCPeerConnection
        this.guests = new Set();
        
        this.init();
    }

    init() {
        // Extrai callId da URL
        const path = window.location.pathname;
        const match = path.match(/\/host\/([^\/]+)/);
        if (!match) {
            alert('Call ID não encontrado na URL');
            return;
        }

        this.callId = match[1];
        this.connectWebSocket();
        this.setupAudioControls();
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
                role: 'host',
                clientId
            }));
            this.updateStatus('Conectado', true);
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
                console.log('Host conectado à sala');
                break;

            case 'guest-joined':
                this.handleGuestJoined(data.guestId);
                break;

            case 'guest-left':
                this.handleGuestLeft(data.guestId);
                break;

            case 'answer':
                this.handleAnswer(data.answer, data.guestId);
                break;

            case 'ice-candidate':
                this.handleIceCandidate(data.candidate, data.guestId);
                break;
        }
    }

    async handleGuestJoined(guestId) {
        this.guests.add(guestId);
        this.updateGuestsList();

        if (!this.localStream) {
            await this.startMicrophone();
        }

        // Cria RTCPeerConnection para este guest
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        // Adiciona áudio do microfone ao peer connection
        this.localStream.getTracks().forEach(track => {
            pc.addTrack(track, this.localStream);
        });

        // Lida com ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.ws.send(JSON.stringify({
                    type: 'ice-candidate',
                    callId: this.callId,
                    targetGuestId: guestId,
                    candidate: event.candidate
                }));
            }
        };

        this.peerConnections.set(guestId, pc);

        // Cria offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        this.ws.send(JSON.stringify({
            type: 'offer',
            callId: this.callId,
            targetGuestId: guestId,
            offer: offer
        }));
    }

    async handleAnswer(answer, guestId) {
        const pc = this.peerConnections.get(guestId);
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }

    handleIceCandidate(candidate, guestId) {
        const pc = this.peerConnections.get(guestId);
        if (pc) {
            pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }

    handleGuestLeft(guestId) {
        this.guests.delete(guestId);
        const pc = this.peerConnections.get(guestId);
        if (pc) {
            pc.close();
        }
        this.peerConnections.delete(guestId);
        this.updateGuestsList();
    }

    async startMicrophone() {
        try {
            // Solicita acesso ao microfone
            this.localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            
            document.getElementById('micBtn').textContent = 'Microfone Ativo ✓';
            document.getElementById('micBtn').disabled = true;
        } catch (error) {
            console.error('Erro ao acessar microfone:', error);
            alert('Erro ao acessar microfone. Verifique as permissões.');
        }
    }

    setupAudioControls() {
        document.getElementById('micBtn').addEventListener('click', () => {
            this.startMicrophone();
        });
    }

    updateStatus(message, connected) {
        const statusEl = document.getElementById('status');
        statusEl.textContent = message;
        statusEl.className = 'status' + (connected ? ' connected' : '');
    }

    updateGuestsList() {
        const listEl = document.getElementById('guestsList');
        if (this.guests.size === 0) {
            listEl.innerHTML = '<p style="color: #888;">Nenhum cliente conectado ainda...</p>';
        } else {
            listEl.innerHTML = Array.from(this.guests).map(guestId => 
                `<div class="guest-item">
                    <span>👤 Cliente ${guestId.substring(0, 8)}</span>
                    <span style="color: #4caf50;">● Conectado</span>
                </div>`
            ).join('');
        }
    }

    generateId() {
        return Math.random().toString(36).substring(2, 15);
    }
}

// Inicializa quando a página carrega
window.addEventListener('DOMContentLoaded', () => {
    new HostController();
});
