"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

type CallItem = {
  callId: string;
  title: string | null;
  videoUrl: string;
  callerName: string | null;
  callerAvatarUrl: string | null;
  createdAt: string;
  expiresAt: string | null;
  expectedAmount?: number | null;
  expired?: boolean;
};

type Sale = {
  id: string;
  callId: string;
  amount: number;
  note: string | null;
  at: string;
};

function fmtDateLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function fmtBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function isExpired(c: CallItem) {
  if (c.expired !== undefined) return c.expired;
  if (!c.expiresAt) return false;
  return Date.now() > new Date(c.expiresAt).getTime();
}

export default function DashboardPage() {
  const [authed, setAuthed] = React.useState<boolean | null>(null);
  const [calls, setCalls] = React.useState<CallItem[]>([]);
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [menuSidebarOpen, setMenuSidebarOpen] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const [videoFile, setVideoFile] = React.useState<File | null>(null);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [callerName, setCallerName] = React.useState("");
  const [expectedAmount, setExpectedAmount] = React.useState<string>("");
  const [toast, setToast] = React.useState<string | null>(null);
  const [createdLink, setCreatedLink] = React.useState<string | null>(null);
  const [createdCallAmount, setCreatedCallAmount] = React.useState<number | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), 1600);
  }

  async function refresh() {
    const resp = await apiFetch("/api/calls");
    const data = await resp.json();
    setCalls(Array.isArray(data?.calls) ? data.calls : []);

    const salesResp = await apiFetch("/api/sales");
    if (salesResp.ok) {
      const salesData = await salesResp.json();
      setSales(Array.isArray(salesData?.sales) ? salesData.sales : []);
    }
  }

  React.useEffect(() => {
    (async () => {
      const me = await apiFetch("/api/auth/me");
      if (!me.ok) {
        window.location.href = "/login";
        return;
      }
      setAuthed(true);
      refresh();
    })();
  }, []);

  // Gráfico com valores de vendas
  const chartData = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = 30;
    const start = new Date(today.getTime() - (days - 1) * 86400000);
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(start.getTime() + i * 86400000);
      return { day: d.toISOString(), amount: 0 };
    });

    for (const s of sales) {
      const t = new Date(s.at).getTime();
      if (Number.isNaN(t)) continue;
      const idx = Math.floor((t - start.getTime()) / 86400000);
      if (idx >= 0 && idx < days) buckets[idx].amount += Number(s.amount) || 0;
    }
    return buckets.map((b) => ({ day: fmtDateLabel(b.day), amount: Math.round(b.amount * 100) / 100 }));
  }, [sales]);

  const totalSales = React.useMemo(() => sales.reduce((a, b) => a + (Number(b.amount) || 0), 0), [sales]);

  async function uploadVideo(file: File) {
    // Upload para Cloudinary ou serviço externo
    const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    
    if (cloudinaryCloudName) {
      // Upload para Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'callsimulador'); // Configure no Cloudinary
      formData.append('folder', 'videos');
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/video/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Falha ao fazer upload para Cloudinary');
      const data = await response.json();
      return data.secure_url;
    }
    
    // Fallback: enviar para API backend (que pode fazer upload)
    const fd = new FormData();
    fd.append("video", file);
    const resp = await apiFetch("/api/upload-video", { method: "POST", body: fd });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error || "Falha ao enviar vídeo");
    return data.videoUrl as string;
  }

  async function uploadAvatar(file: File) {
    // Upload para Cloudinary ou serviço externo
    const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    
    if (cloudinaryCloudName) {
      // Upload para Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'callsimulador'); // Configure no Cloudinary
      formData.append('folder', 'avatars');
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Falha ao fazer upload para Cloudinary');
      const data = await response.json();
      return data.secure_url;
    }
    
    // Fallback: enviar para API backend
    const fd = new FormData();
    fd.append("avatar", file);
    const resp = await apiFetch("/api/upload-avatar", { method: "POST", body: fd });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error || "Falha ao enviar avatar");
    return data.avatarUrl as string;
  }

  async function createCall() {
    setLoading(true);
    try {
      let vUrl = videoUrl;
      let aUrl = avatarUrl;
      if (videoFile && !vUrl) vUrl = await uploadVideo(videoFile);
      if (!vUrl) throw new Error("Selecione um vídeo");
      if (avatarFile && !aUrl) aUrl = await uploadAvatar(avatarFile);

      const resp = await apiFetch("/api/create-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: vUrl,
          callerName: callerName || null,
          callerAvatarUrl: aUrl || null,
          title: title || null,
          expectedAmount: expectedAmount || null
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Erro ao criar call");

      const link = `${window.location.origin}${data.ringUrl}`;
      await navigator.clipboard.writeText(link);
      setCreatedLink(link);
      if (data?.sale?.amount) {
        setCreatedCallAmount(Number(data.sale.amount));
        showToast("Link copiado! Venda registrada.");
      } else {
        setCreatedCallAmount(null);
        showToast("Link copiado para área de transferência");
      }

      setTitle("");
      setCallerName("");
      setExpectedAmount("");
      setVideoFile(null);
      setAvatarFile(null);
      setVideoUrl(null);
      setAvatarUrl(null);

      await refresh();
      
      // Fecha o modal após 10 segundos
      setTimeout(() => setCreatedLink(null), 10000);
    } catch (e: any) {
      showToast(e?.message || "Falha ao criar call");
    } finally {
      setLoading(false);
    }
  }

  async function expireNow(callId: string) {
    try {
      const ok = window.confirm("Expirar este link agora?");
      if (!ok) return;
      const resp = await apiFetch(`/api/call/${encodeURIComponent(callId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expireNow: true })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Erro ao expirar");
      await refresh();
      showToast("Link expirado");
    } catch (e: any) {
      showToast(e?.message || "Falha ao expirar");
    }
  }

  async function deleteCall(callId: string) {
    try {
      const ok = window.confirm("Apagar esta call?");
      if (!ok) return;
      const resp = await apiFetch(`/api/call/${encodeURIComponent(callId)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Erro ao apagar");
      await refresh();
      showToast("Call apagada");
    } catch (e: any) {
      showToast(e?.message || "Falha ao apagar");
    }
  }

  async function markSale(callId: string) {
    try {
      const call = calls.find((c) => c.callId === callId);
      const defaultValue = call?.expectedAmount ? String(call.expectedAmount) : "297";
      const amountStr = window.prompt("Valor da venda (ex: 297):", defaultValue);
      if (amountStr === null) return;
      const amount = Number(amountStr.replace(",", "."));
      if (!Number.isFinite(amount) || amount <= 0) {
        showToast("Valor inválido");
        return;
      }
      const note = window.prompt("Observação (opcional):", "") || null;
      const resp = await apiFetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId, amount, note })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Erro ao marcar venda");
      await refresh();
      showToast("Venda registrada");
    } catch (e: any) {
      showToast(e?.message || "Falha ao marcar venda");
    }
  }

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    authed === null ? (
      <div className="flex min-h-screen items-center justify-center text-white/70 bg-black">
        Carregando...
      </div>
    ) : (
    <div className="min-h-screen flex flex-col bg-black text-gray-200" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="h-16 border-b border-neutral-800 bg-black flex items-center justify-between px-4 lg:px-6 z-20 shadow-md sticky top-0 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-white hover:bg-neutral-800 rounded"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <svg width="32" height="32" className="lg:w-10 lg:h-10 flex-shrink-0" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="38" fill="#1a1a1a" stroke="#d61f1f" strokeWidth="2" />
            <polygon points="30,25 30,55 55,40" fill="#d61f1f" />
            <circle cx="60" cy="20" r="8" fill="#d61f1f" />
            <rect x="56" y="24" width="8" height="4" fill="#d61f1f" rx="1" />
            <rect x="58" y="28" width="4" height="2" fill="#d61f1f" rx="1" />
          </svg>
          <div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tighter">
              <span className="text-white">CALL</span><span className="text-[#d61f1f]">HOT</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center space-x-2 lg:space-x-3">
          <Button variant="secondary" onClick={refresh} className="text-xs h-8 px-2 lg:px-3">
            Atualizar
          </Button>
          <Button variant="secondary" onClick={logout} className="text-xs h-8 px-2 lg:px-3">
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row relative">
        {/* Overlay para mobile - sidebar configuração */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        {/* Sidebar Left - Configuração */}
        <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} fixed lg:static inset-y-0 left-0 w-[300px] lg:w-[400px] border-r border-neutral-800 bg-[#0a0a0a] flex flex-col z-50 lg:z-10 shadow-2xl flex-shrink-0 transition-transform duration-300 ease-in-out`}>
          {/* Botão de Menu no topo */}
          <div className="p-3 lg:p-4 border-b border-neutral-800 bg-neutral-900/50">
            <button
              onClick={() => setMenuSidebarOpen(true)}
              className="w-full py-2.5 px-4 rounded font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700"
            >
              Menu
            </button>
          </div>

          {/* Menu Sidebar - abre sobre a sidebar de configurações */}
          {menuSidebarOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/50"
                style={{ zIndex: 60 }}
                onClick={() => setMenuSidebarOpen(false)}
              />
              <div className={`fixed top-0 left-0 h-full w-[300px] lg:w-[400px] bg-[#0a0a0a] border-r border-neutral-800 shadow-2xl transform transition-transform duration-300 ease-in-out ${menuSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ zIndex: 70 }}>
                <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Menu</h2>
                  <button
                    onClick={() => setMenuSidebarOpen(false)}
                    className="p-1 hover:bg-neutral-800 rounded text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-4 space-y-2 overflow-y-auto h-full">
                  <Link
                    href="/sales"
                    onClick={() => {
                      setMenuSidebarOpen(false);
                      setSidebarOpen(false);
                    }}
                    className="block px-4 py-3 rounded text-sm font-semibold transition-all text-white bg-neutral-900/50 hover:bg-neutral-800 hover:border-[#d61f1f]/50 border border-neutral-800"
                  >
                    Vendas
                  </Link>
                  <Link
                    href="/history"
                    onClick={() => {
                      setMenuSidebarOpen(false);
                      setSidebarOpen(false);
                    }}
                    className="block px-4 py-3 rounded text-sm font-semibold transition-all text-white bg-neutral-900/50 hover:bg-neutral-800 hover:border-[#d61f1f]/50 border border-neutral-800"
                  >
                    Histórico de Calls
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => {
                      setMenuSidebarOpen(false);
                      setSidebarOpen(false);
                    }}
                    className="block px-4 py-3 rounded text-sm font-semibold transition-all text-white bg-neutral-900/50 hover:bg-neutral-800 hover:border-[#d61f1f]/50 border border-neutral-800"
                  >
                    Configurações
                  </Link>
                </div>
              </div>
            </>
          )}

          <div className="p-3 lg:p-4 border-b border-neutral-800 bg-neutral-900/50">
            <h2 className="text-[10px] lg:text-xs font-bold text-white uppercase tracking-wider flex items-center">
              <svg className="w-4 h-4 mr-2 text-[#d61f1f]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
              Configuração
            </h2>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); createCall(); }} className="p-3 lg:p-4 space-y-3 lg:space-y-4">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Nova Chamada</label>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Nome da Call</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Oferta - Lead João"
                    className="h-9 text-xs bg-black border-neutral-800 text-white placeholder:text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Valor da Venda (R$)</label>
                  <Input
                    value={expectedAmount}
                    onChange={(e) => {
                      // Permite apenas números, vírgula e ponto
                      const val = e.target.value.replace(/[^\d,.]/g, '');
                      setExpectedAmount(val);
                    }}
                    placeholder="Ex: 297 ou 297,90"
                    className="h-9 text-xs bg-black border-neutral-800 text-white placeholder:text-gray-600"
                  />
                  <p className="text-[9px] text-gray-600 mt-1">Use vírgula para decimais (ex: 297,90)</p>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Nome de quem liga</label>
                  <Input
                    value={callerName}
                    onChange={(e) => setCallerName(e.target.value)}
                    placeholder="Ex: Bia"
                    className="h-9 text-xs bg-black border-neutral-800 text-white placeholder:text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Avatar</label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    className="h-9 text-xs bg-black border-neutral-800 text-white/70 file:mr-4 file:rounded file:border-0 file:bg-[#d61f1f] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#b91c1c]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Vídeo</label>
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="h-9 text-xs bg-black border-neutral-800 text-white/70 file:mr-4 file:rounded file:border-0 file:bg-[#d61f1f] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#b91c1c]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 lg:pt-4 border-t border-neutral-800">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 lg:py-3 px-4 rounded font-bold text-white text-xs lg:text-sm uppercase tracking-wider shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 bg-gradient-to-r from-[#b91c1c] to-[#d61f1f] hover:from-[#991b1b] hover:to-[#b91c1c]"
              >
                {loading ? "Criando..." : "Criar Chamada"}
              </button>
            </div>
          </form>
        </div>

        {/* Center - Gráfico */}
        <div className="flex-1 bg-black flex flex-col relative min-w-0">
          {/* Stats Bar */}
          <div className="border-b border-neutral-800 bg-[#0a0a0a] z-10 flex-shrink-0 py-3 lg:py-6">
            <div className="grid grid-cols-3 h-full divide-x divide-neutral-800 gap-2 lg:gap-0">
              <div className="flex flex-col items-center justify-center p-2 lg:p-4 bg-gradient-to-br from-green-900/20 to-transparent">
                <span className="text-[8px] lg:text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Total Calls</span>
                <span className="text-xl lg:text-3xl font-black text-green-400">{calls.length}</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 lg:p-4 bg-gradient-to-br from-blue-900/20 to-transparent">
                <span className="text-[8px] lg:text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Total Vendas</span>
                <span className="text-xl lg:text-3xl font-black text-blue-400">{sales.length}</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 lg:p-4 bg-gradient-to-br from-red-900/20 to-transparent">
                <span className="text-[8px] lg:text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Valor Total</span>
                <span className="text-sm lg:text-3xl font-black text-[#d61f1f] break-all text-center">{fmtBRL(totalSales)}</span>
              </div>
            </div>
          </div>

          {/* Gráfico e Lista */}
          <div className="flex flex-col z-10">
            <div className="flex-shrink-0 p-3 lg:p-4">
              <div className="flex items-center justify-between mb-2 lg:mb-3 px-1">
                <span className="text-[9px] lg:text-[10px] font-bold text-gray-500 uppercase tracking-wider">Vendas (30 dias)</span>
              </div>
              <div className="h-[200px] lg:h-[280px] bg-[#050505] border border-neutral-800 rounded p-2 lg:p-3 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                    <defs>
                      <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(214, 31, 31, 0.5)" />
                        <stop offset="100%" stopColor="rgba(214, 31, 31, 0.05)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} />
                    <YAxis
                      stroke="rgba(255,255,255,0.5)"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => fmtBRL(value)}
                    />
                    <Tooltip
                      contentStyle={{ background: "rgba(0,0,0,0.95)", border: "1px solid rgba(214,31,31,0.3)" }}
                      labelStyle={{ color: "rgba(255,255,255,0.8)" }}
                      formatter={(value: number) => [fmtBRL(value), "Vendas"]}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#d61f1f" fill="url(#fill)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Lista de Calls */}
            <div className="px-3 lg:px-4 pb-3 lg:pb-10">
              <div className="mb-2 lg:mb-4">
                <span className="text-[9px] lg:text-[10px] font-bold text-gray-500 uppercase tracking-wider">Calls Criadas</span>
              </div>
              <div className="space-y-2 lg:space-y-3 pb-2">
                {calls.length === 0 ? (
                  <div className="text-xs lg:text-sm text-white/60 text-center py-6 lg:py-8">Nenhuma call criada ainda.</div>
                ) : (
                  calls.map((call) => {
                    const expired = isExpired(call);
                    const link = `${window.location.origin}/ring/${call.callId}`;
                    return (
                      <div
                        key={call.callId}
                        className="bg-[#050505] border border-neutral-800 rounded p-3 lg:p-4 space-y-2 lg:space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs lg:text-sm font-semibold text-white break-words">
                                {call.title || `Call ${call.callId.slice(0, 8)}`}
                              </span>
                              <span
                                className={`text-[9px] lg:text-[10px] px-1.5 lg:px-2 py-0.5 rounded font-bold uppercase whitespace-nowrap ${
                                  expired
                                    ? "bg-red-900/30 text-red-400 border border-red-800/50"
                                    : "bg-green-900/30 text-green-400 border border-green-800/50"
                                }`}
                              >
                                {expired ? "Expirado" : "Ativo"}
                              </span>
                            </div>
                            {call.callerName && (
                              <div className="text-[10px] lg:text-xs text-white/60">Ligando: {call.callerName}</div>
                            )}
                            {call.expectedAmount && (
                              <div className="text-[10px] lg:text-xs text-white/60">
                                Valor: {fmtBRL(Number(call.expectedAmount))}
                              </div>
                            )}
                            <div className="text-[9px] lg:text-[10px] text-white/40 mt-1 font-mono break-all">
                              {new Date(call.createdAt).toLocaleString("pt-BR", { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 lg:gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-[10px] lg:text-xs h-7 lg:h-8 px-2 lg:px-3 flex-1 lg:flex-initial"
                            onClick={async () => {
                              await navigator.clipboard.writeText(link);
                              showToast("Link copiado");
                            }}
                          >
                            Copiar link
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-[10px] lg:text-xs h-7 lg:h-8 px-2 lg:px-3 flex-1 lg:flex-initial"
                            onClick={() => expireNow(call.callId)}
                            disabled={expired}
                          >
                            Expirar
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-[10px] lg:text-xs h-7 lg:h-8 px-2 lg:px-3 text-red-400 hover:text-red-300 flex-1 lg:flex-initial"
                            onClick={() => deleteCall(call.callId)}
                          >
                            Apagar
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de link criado */}
      {createdLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setCreatedLink(null)}>
          <div className="bg-[#1a1a1a] border border-[#d61f1f]/30 rounded-lg p-4 lg:p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base lg:text-lg font-bold text-white mb-3 lg:mb-4">Call criada com sucesso!</h3>
            {createdCallAmount && (
              <div className="mb-3 lg:mb-4 p-3 bg-green-900/20 border border-green-800/50 rounded">
                <div className="text-xs text-gray-400 mb-1">Valor da venda:</div>
                <div className="text-lg font-bold text-green-400">{fmtBRL(createdCallAmount)}</div>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-2">Link da chamada:</label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdLink}
                  className="flex-1 px-3 py-2 bg-black border border-neutral-800 rounded text-xs lg:text-sm text-white font-mono"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  onClick={async () => {
                    await navigator.clipboard.writeText(createdLink);
                    showToast("Link copiado novamente");
                  }}
                  className="px-4 py-2 bg-[#d61f1f] hover:bg-[#b91c1c] text-white text-xs lg:text-sm whitespace-nowrap"
                >
                  Copiar
                </Button>
              </div>
            </div>
            <Button
              onClick={() => {
                setCreatedLink(null);
                setCreatedCallAmount(null);
              }}
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs lg:text-sm"
            >
              Fechar
            </Button>
          </div>
        </div>
      )}

      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[#d61f1f]/30 bg-black/90 px-4 py-2 text-sm text-white shadow-2xl">
          {toast}
        </div>
      ) : null}
    </div>
    )
  );
}
