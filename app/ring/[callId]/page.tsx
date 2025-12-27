"use client";

import * as React from "react";
import { Phone, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

type CallInfo = {
  callId: string;
  title: string | null;
  callerName: string | null;
  callerAvatarUrl: string | null;
  expiresAt: string | null;
};

function initials(name?: string | null) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
  return ((a + b) || "?").toUpperCase();
}

export default function RingPage({ params }: { params: { callId: string } }) {
  const callId = params.callId;
  const [info, setInfo] = React.useState<CallInfo | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const resp = await apiFetch(`/api/call/${encodeURIComponent(callId)}`);
        const data = await resp.json();
        if (!resp.ok) {
          setError(data?.error || "Falha ao carregar call");
          return;
        }
        setInfo(data);
      } catch {
        setError("Erro de rede");
      }
    })();
  }, [callId]);

  const name = info?.callerName || "Contato";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 bg-[#0a0612]">
      {/* Background Cinematográfico */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.8))]" />
          {/* Grid animado de fundo opcional */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
      
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Avatar com efeito de pulso e glow */}
        <div className="mt-4 relative">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping-slow" />
          <div className="relative h-36 w-36 overflow-hidden rounded-full border-[3px] border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.3)] backdrop-blur-md">
            {info?.callerAvatarUrl ? (
              <img
                src={info.callerAvatarUrl}
                alt="Avatar"
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-110"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gradient-to-br from-neutral-800 to-neutral-900 text-4xl font-black text-white">
                {initials(name)}
              </div>
            )}
          </div>
        </div>

        {/* Informações da Chamada */}
        <div className="mt-8 space-y-2 text-center">
          <div className="text-4xl font-black tracking-tighter text-white drop-shadow-2xl">
            {name}
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.3em] drop-shadow-md">
              {name} está te ligando
            </span>
          </div>
        </div>

        {/* Ações de Chamada */}
        <div className="mt-24 grid grid-cols-2 gap-12 w-full px-6">
          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            className={cn(
              "group flex flex-col items-center gap-4 transition-all duration-300 hover:scale-105",
              error ? "opacity-60" : ""
            )}
          >
            <div className="relative h-20 w-20 flex items-center justify-center rounded-full bg-red-600 shadow-[0_0_30px_rgba(214,31,31,0.3)] transition-all group-hover:bg-red-500 group-hover:shadow-[0_0_40px_rgba(214,31,31,0.5)]">
              <PhoneOff className="h-8 w-8 text-white" />
            </div>
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest group-hover:text-white/80 transition-colors">Recusar</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              try {
                await apiFetch("/api/track", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ callId, type: "call_answer" })
                });
              } catch {}
              window.location.href = `/video/${encodeURIComponent(callId)}`;
            }}
            className={cn("group flex flex-col items-center gap-4 transition-all duration-300 hover:scale-105", error ? "pointer-events-none opacity-40" : "")}
          >
            <div className="relative h-20 w-20 flex items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all group-hover:bg-emerald-400 group-hover:shadow-[0_0_40px_rgba(16,185,129,0.6)]">
              <Phone className="relative z-10 h-8 w-8 text-white animate-call-wiggle" />
              <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse" />
            </div>
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest group-hover:text-white/80 transition-colors">Atender</span>
          </button>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes ping-slow {
          75%, 100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
        @keyframes call-wiggle {
          0%, 100% { transform: rotate(-10deg); }
          50% { transform: rotate(10deg); }
        }
        .animate-ping-slow {
          animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .animate-call-wiggle {
          animation: call-wiggle 0.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}


