"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

type EventItem = {
  id: string;
  type: string;
  callId: string;
  at: string;
  amount?: number;
};

export default function HistoryPage() {
  const [events, setEvents] = React.useState<EventItem[]>([]);

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function refresh() {
    const resp = await apiFetch("/api/history");
    if (resp.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = await resp.json();
    setEvents(Array.isArray(data?.events) ? data.events : []);
  }

  React.useEffect(() => {
    refresh();
  }, []);

  const rows = React.useMemo(() => {
    const map = new Map<string, { ring: number; answered: number; created: number; sales: number }>();
    for (const e of events) {
      const cur = map.get(e.callId) || { ring: 0, answered: 0, created: 0, sales: 0 };
      if (e.type === "ring_open" || e.type === "call_view") cur.ring += 1;
      if (e.type === "call_answer") cur.answered += 1;
      if (e.type === "call_created") cur.created += 1;
      if (e.type === "sale_marked") cur.sales += 1;
      map.set(e.callId, cur);
    }
    return Array.from(map.entries()).map(([callId, agg]) => ({ callId, ...agg }));
  }, [events]);

  return (
    <AppShell title="Histórico" onLogout={logout}>
      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={refresh}>Atualizar</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo por call</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-white/60">Sem eventos ainda.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-white/60">
                  <tr className="border-b border-white/10">
                    <th className="py-2 text-left font-semibold">Call ID</th>
                    <th className="py-2 text-left font-semibold">Aberturas</th>
                    <th className="py-2 text-left font-semibold">Atendidas</th>
                    <th className="py-2 text-left font-semibold">Vendas</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.callId} className="border-b border-white/5">
                      <td className="py-2 font-mono text-white/80">{r.callId.slice(0, 8)}...</td>
                      <td className="py-2">{r.ring}</td>
                      <td className="py-2">{r.answered}</td>
                      <td className="py-2">{r.sales}</td>
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


