"use client";

import { Bell, BellOff, Share, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

// Liga a notificação no celular.
//
// No Android funciona direto pelo navegador. No iPhone, a Apple só entrega
// notificação se o sistema estiver INSTALADO na tela de início — por isso
// existe o passo a passo aqui: sem ele a pessoa toca no botão, nada acontece,
// e conclui que o sistema está quebrado.

type Estado = "carregando" | "indisponivel" | "precisa-instalar" | "desligado" | "ligado" | "negado";

/** Converte a chave pública (base64url) para o formato que o navegador exige. */
function chaveParaBytes(base64: string): ArrayBuffer {
  const preenchido = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const normal = preenchido.replace(/-/g, "+").replace(/_/g, "/");
  const cru = atob(normal);
  const bytes = new Uint8Array(cru.length);
  for (let i = 0; i < cru.length; i++) bytes[i] = cru.charCodeAt(i);
  return bytes.buffer;
}

function ehIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** O sistema foi aberto pela tela de início (instalado), e não pelo navegador? */
function estaInstalado(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function AtivarNotificacoes() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        // iPhone sem instalar cai aqui: o Safari só expõe o PushManager depois
        // que o sistema está na tela de início.
        setEstado(ehIOS() && !estaInstalado() ? "precisa-instalar" : "indisponivel");
        return;
      }
      if (Notification.permission === "denied") {
        setEstado("negado");
        return;
      }
      const registro = await navigator.serviceWorker.ready;
      const inscricao = await registro.pushManager.getSubscription();
      setEstado(inscricao ? "ligado" : "desligado");
    })().catch(() => setEstado("indisponivel"));
  }, []);

  const ligar = async () => {
    setOcupado(true);
    try {
      const conf = await (await fetch("/api/push/inscrever")).json();
      if (!conf.configurado || !conf.chavePublica) {
        setEstado("indisponivel");
        return;
      }

      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "negado" : "desligado");
        return;
      }

      const registro = await navigator.serviceWorker.ready;
      const inscricao = await registro.pushManager.subscribe({
        // Exigido pelos navegadores: toda mensagem enviada tem de ser visível
        // para a pessoa. Não dá para usar push silencioso para rastrear.
        userVisibleOnly: true,
        applicationServerKey: chaveParaBytes(conf.chavePublica),
      });

      const dados = inscricao.toJSON();
      await fetch("/api/push/inscrever", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          endpoint: dados.endpoint,
          keys: dados.keys,
          aparelho: navigator.userAgent,
        }),
      });
      setEstado("ligado");
    } catch {
      setEstado("indisponivel");
    } finally {
      setOcupado(false);
    }
  };

  const desligar = async () => {
    setOcupado(true);
    try {
      const registro = await navigator.serviceWorker.ready;
      const inscricao = await registro.pushManager.getSubscription();
      if (inscricao) {
        await fetch("/api/push/inscrever", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: inscricao.endpoint }),
        });
        await inscricao.unsubscribe();
      }
      setEstado("desligado");
    } catch {
      // Deixa como estava: melhor não mentir que desligou.
    } finally {
      setOcupado(false);
    }
  };

  if (estado === "carregando" || estado === "indisponivel") return null;

  if (estado === "precisa-instalar") {
    return (
      <div className="rounded-xl border border-[#bfe0d9] bg-[#f2fbf9] p-4">
        <p className="flex items-center gap-2 font-semibold text-[#05605e]">
          <Smartphone size={18} aria-hidden="true" />
          Para o iPhone avisar, instale o ConfecControl
        </p>
        <p className="mt-1 text-sm text-[#3f7d78]">
          No iPhone, a Apple só permite notificação depois que o sistema está na tela de início. Leva 15
          segundos e é uma vez só:
        </p>
        <ol className="mt-2 space-y-1 text-sm text-[#3f7d78]">
          <li className="flex items-start gap-2">
            <span className="font-bold">1.</span>
            <span>
              Toque no botão <Share size={13} className="inline" aria-label="compartilhar" /> Compartilhar,
              embaixo da tela
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">2.</span>
            <span>Escolha &quot;Adicionar à Tela de Início&quot;</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">3.</span>
            <span>Abra o ConfecControl por esse ícone e ligue o aviso aqui</span>
          </li>
        </ol>
      </div>
    );
  }

  if (estado === "negado") {
    return (
      <div className="rounded-xl border border-[#ead49c] bg-[#fffcf3] p-4">
        <p className="flex items-center gap-2 font-semibold text-[#7b5a0b]">
          <BellOff size={18} aria-hidden="true" />
          Notificação bloqueada neste aparelho
        </p>
        <p className="mt-1 text-sm text-[#7b5a0b]">
          A permissão foi recusada. Para liberar, abra os ajustes do navegador neste site e permita
          notificações — o sistema não consegue pedir de novo sozinho.
        </p>
      </div>
    );
  }

  const ligado = estado === "ligado";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d9e1dd] bg-white p-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-semibold text-[#1c2420]">
          {ligado ? <Bell size={17} aria-hidden="true" /> : <BellOff size={17} aria-hidden="true" />}
          {ligado ? "Este aparelho avisa" : "Avisar neste aparelho"}
        </p>
        <p className="mt-0.5 text-sm text-[#66756d]">
          {ligado
            ? "Você recebe aviso mesmo com o sistema fechado. Urgente vibra mais."
            : "Receba pedido de ajuda e mudança de pedido direto no celular, sem precisar deixar a tela aberta."}
        </p>
      </div>
      <button
        type="button"
        onClick={ligado ? desligar : ligar}
        disabled={ocupado}
        className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:opacity-60 ${
          ligado
            ? "border border-[#c7d3ce] bg-white text-[#405047] hover:bg-[#f8faf9]"
            : "bg-[#087f7d] text-white hover:bg-[#05605e]"
        }`}
      >
        {ocupado ? "Um momento..." : ligado ? "Desligar" : "Ligar aviso"}
      </button>
    </div>
  );
}
