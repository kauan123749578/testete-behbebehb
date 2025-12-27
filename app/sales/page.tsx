"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

type Sale = {
  id: string;
  callId: string;
  amount: number;
  note: string | null;
  at: string;
};

function fmtBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function SalesPage() {
  const [sales, setSales] = React.useState<Sale[]>([]);

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function refresh() {
    const resp = await apiFetch("/api/sales");
    if (resp.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = await resp.json();
    setSales(Array.isArray(data?.sales) ? data.sales : []);
  }

  React.useEffect(() => {
    refresh();
  }, []);

  const totals = React.useMemo(() => {
    const days = 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today.getTime() - (days - 1) * 86400000);
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(start.getTime() + i * 86400000);
      return {
        dayISO: d.toISOString(),
        day: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        amount: 0
      };
    });

    for (const s of sales) {
      const t = new Date(s.at).getTime();
      if (Number.isNaN(t)) continue;
      const idx = Math.floor((t - start.getTime()) / 86400000);
      if (idx >= 0 && idx < days) buckets[idx].amount += Number(s.amount) || 0;
    }

    return buckets.map((b) => ({ day: b.day, amount: Math.round(b.amount * 100) / 100 }));
  }, [sales]);

  const sum = React.useMemo(() => sales.reduce((a, b) => a + (Number(b.amount) || 0), 0), [sales]);

  return (
    <AppShell title="Vendas" onLogout={logout}>
      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={refresh}>Atualizar</Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Volume de vendas</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={totals} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255, 30, 150, 0.55)" />
                    <stop offset="100%" stopColor="rgba(255, 90, 190, 0.05)" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.45)" tick={{ fontSize: 12 }} />
                <YAxis stroke="rgba(255,255,255,0.45)" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.10)" }}
                  labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                />
                <Area type="monotone" dataKey="amount" stroke="#ff1e96" fill="url(#salesFill)" strokeWidth={2.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/60">Total vendido</div>
              <div className="mt-1 text-2xl font-extrabold tracking-tight">
                {fmtBRL(sum)}
              </div>
            </div>
            <div className="text-sm text-white/60">
              As vendas são marcadas manualmente no dashboard (botão “Marcar venda”).
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Últimas vendas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sales.length === 0 ? (
            <div className="text-sm text-white/60">Sem vendas ainda.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-white/60">
                  <tr className="border-b border-white/10">
                    <th className="py-2 text-left font-semibold">Quando</th>
                    <th className="py-2 text-left font-semibold">Call</th>
                    <th className="py-2 text-left font-semibold">Valor</th>
                    <th className="py-2 text-left font-semibold">Obs</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice().reverse().slice(0, 50).map((s) => (
                    <tr key={s.id} className="border-b border-white/5">
                      <td className="py-2 text-white/80">{new Date(s.at).toLocaleString("pt-BR")}</td>
                      <td className="py-2 font-mono text-white/80">{s.callId.slice(0, 8)}...</td>
                      <td className="py-2">R$ {Number(s.amount).toFixed(2).replace(".", ",")}</td>
                      <td className="py-2 text-white/70">{s.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}


