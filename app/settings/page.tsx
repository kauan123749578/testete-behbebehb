"use client";

import * as React from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

export default function SettingsPage() {
  const [email, setEmail] = React.useState<string | null>(null);

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  React.useEffect(() => {
    (async () => {
      const resp = await apiFetch("/api/auth/me");
      if (!resp.ok) {
        window.location.href = "/login";
        return;
      }
      const data = await resp.json();
      setEmail(data?.email || null);
    })();
  }, []);

  return (
    <AppShell title="Configurações" onLogout={logout}>
      <Card>
        <CardHeader>
          <CardTitle>Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-white/70">
            Email: <span className="font-semibold text-white">{email || "—"}</span>
          </div>
          <div className="text-sm text-white/55">
            Mais opções (ex.: integração, limites, planos) podem entrar aqui.
          </div>
          <div className="pt-2">
            <Button variant="secondary" onClick={logout}>Sair</Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}


