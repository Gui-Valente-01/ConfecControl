// Service worker do ConfecControl (PWA).
// IMPORTANTE: cacheia APENAS assets estaticos imutaveis (build do Next e icones).
// Paginas, dados e Server Actions SEMPRE vao para a rede — assim nao ha risco de
// mostrar conteudo desatualizado ou de outro usuario quando offline.

const CACHE = "confeccontrol-static-v1";

// Em DESENVOLVIMENTO o service worker se remove sozinho.
//
// Ele guarda os arquivos de /_next/static/ e serve do cache primeiro. Em
// producao isso e seguro, porque cada build gera nomes novos. No dev os nomes
// se repetem entre reinicios do servidor: o navegador passava a executar JS
// velho, com IDs de Server Action que nao existiam mais no servidor -- o erro
// "Server Action was not found". Como o proprio sw.js e buscado direto na rede,
// esta verificacao desfaz o registro antigo sem ninguem precisar limpar nada
// pelo DevTools.
const DEV = ["localhost", "127.0.0.1", "[::1]"].includes(self.location.hostname);

self.addEventListener("install", () => {
  self.skipWaiting();
});

if (DEV) {
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        await self.registration.unregister();
        // Recarrega as abas abertas: assim elas saem do controle deste worker e
        // voltam a buscar tudo na rede, sem ninguem apertar nada.
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) client.navigate(client.url);
      })(),
    );
  });
} else {
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        );
        await self.clients.claim();
      })(),
    );
  });

  self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    const isStatic =
      url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname === "/manifest.webmanifest";

    // Tudo que nao for estatico passa direto pela rede (consciente de auth/dados).
    if (!isStatic) return;

    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res.ok) {
            const cache = await caches.open(CACHE);
            cache.put(req, res.clone());
          }
          return res;
        } catch {
          return cached || Response.error();
        }
      })(),
    );
  });
}

// ---------------------------------------------------------------------------
// Notificacao no celular (Web Push)
// ---------------------------------------------------------------------------
//
// O push chega mesmo com o sistema fechado: quem esta na oficina nao fica com
// a tela aberta o dia inteiro.

self.addEventListener("push", (event) => {
  let dados = { titulo: "ConfecControl", corpo: "Novo aviso.", urgente: false, url: "/avisos" };
  try {
    if (event.data) dados = { ...dados, ...event.data.json() };
  } catch {
    // Mensagem malformada nao pode impedir o aviso de aparecer.
  }

  event.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      // Urgente vibra e fica na tela ate a pessoa tocar; o resto some sozinho.
      // Numa oficina barulhenta, vibrar e o que faz a pessoa perceber.
      vibrate: dados.urgente ? [200, 100, 200, 100, 200] : [100],
      requireInteraction: Boolean(dados.urgente),
      tag: dados.urgente ? undefined : "confeccontrol-aviso",
      data: { url: dados.url || "/avisos" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = event.notification.data?.url || "/avisos";

  event.waitUntil(
    (async () => {
      const abas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Se o sistema ja esta aberto, reaproveita a aba em vez de abrir outra:
      // no celular, cada toque abrindo aba nova vira uma pilha de abas.
      for (const aba of abas) {
        if (aba.url.includes(self.location.origin)) {
          await aba.focus();
          if ("navigate" in aba) await aba.navigate(destino);
          return;
        }
      }
      await self.clients.openWindow(destino);
    })(),
  );
});
