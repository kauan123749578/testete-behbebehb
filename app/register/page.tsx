"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Erro ao criar conta");
      router.replace(next);
    } catch (err: any) {
      setError(err?.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Nome de Usuário</label>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Ex: joao_silva"
          type="text"
          className="h-12 border-neutral-800 bg-black text-white placeholder:text-gray-600 focus:border-[#d61f1f] transition-all"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sua Senha</label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 3 caracteres"
            className="h-12 border-neutral-800 bg-black pr-12 text-white placeholder:text-gray-600 focus:border-[#d61f1f] transition-all"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#d61f1f] transition-colors"
            disabled={loading}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-900/50 bg-red-900/20 p-3 text-xs text-red-200 animate-shake">
          {error}
        </div>
      ) : null}

      <Button
        className="h-12 w-full bg-gradient-to-r from-[#b91c1c] to-[#d61f1f] text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-red-900/20 hover:from-[#991b1b] hover:to-[#b91c1c] transition-all transform active:scale-[0.98]"
        disabled={loading}
        type="submit"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            Criando...
          </span>
        ) : "Finalizar Cadastro"}
      </Button>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-10 relative overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Background Decorativo Estilo Dashboard */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="rounded-2xl border border-neutral-800 bg-[#0a0a0a] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          {/* Logo Estilo Dashboard */}
          <div className="mb-8 flex flex-col items-center justify-center gap-4">
            <svg width="60" height="60" viewBox="0 0 80 80" className="drop-shadow-[0_0_15px_rgba(214,31,31,0.4)]">
              <circle cx="40" cy="40" r="38" fill="#1a1a1a" stroke="#d61f1f" strokeWidth="2" />
              <polygon points="30,25 30,55 55,40" fill="#d61f1f" />
              <circle cx="60" cy="20" r="8" fill="#d61f1f" />
              <rect x="56" y="24" width="8" height="4" fill="#d61f1f" rx="1" />
              <rect x="58" y="28" width="4" height="2" fill="#d61f1f" rx="1" />
            </svg>
            <div className="text-center">
              <h1 className="text-3xl font-black tracking-tighter">
                <span className="text-white">CALL</span><span className="text-[#d61f1f]">HOT</span>
              </h1>
              <p className="text-[10px] uppercase font-bold text-gray-500 tracking-[0.2em] mt-1">
                Criar Cadastro Grátis
              </p>
            </div>
          </div>

          <React.Suspense fallback={
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <span className="h-10 w-10 animate-spin rounded-full border-4 border-red-600/20 border-t-red-600" />
              <p className="text-xs text-white/50 animate-pulse">Preparando cadastro...</p>
            </div>
          }>
            <RegisterForm />
          </React.Suspense>

          <div className="mt-8 pt-6 border-t border-neutral-800 flex flex-col items-center gap-4">
            <p className="text-xs text-gray-500">Já possui uma conta?</p>
            <Link
              href="/login"
              className="w-full h-11 flex items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/50 text-xs font-bold uppercase tracking-widest text-white hover:bg-neutral-800 hover:border-[#d61f1f]/50 transition-all"
            >
              Fazer Login
            </Link>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
}
