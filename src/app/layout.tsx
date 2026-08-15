import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/toast";
import { PwaRegister } from "@/components/pwa-register";
import { siteUrl } from "@/lib/site";
import { scriptDoTema } from "@/lib/tema";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const descricao =
  "Sistema de gestão para confecção: pedidos, produção por etapa, estoque de peças e cobrança em um lugar só, do corte à entrega.";

export const metadata: Metadata = {
  // Endereço absoluto de todo link gerado nesta página. Sem ele o Next monta as
  // tags de compartilhamento com "localhost", e o link colado no WhatsApp
  // aparece sem título e sem imagem.
  metadataBase: new URL(siteUrl),
  title: {
    default: "ConfecControl — Sistema de gestão para confecção",
    // As telas de dentro passam só o próprio nome e o Next completa o resto.
    template: "%s · ConfecControl",
  },
  description: descricao,
  applicationName: "ConfecControl",
  // Como o dono da confecção procura no Google. São os termos que os
  // concorrentes disputam; sem eles a página não concorre por nenhum.
  keywords: [
    "sistema para confecção",
    "controle de produção confecção",
    "sistema para facção",
    "software para estamparia",
    "gestão de pedidos confecção",
    "controle de pedidos costura",
  ],
  appleWebApp: {
    capable: true,
    title: "ConfecControl",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "ConfecControl",
    title: "ConfecControl — Sistema de gestão para confecção",
    description: descricao,
    url: siteUrl,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ConfecControl" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ConfecControl — Sistema de gestão para confecção",
    description: descricao,
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  // A barra do navegador acompanha o tema do aparelho. Sem o par escuro, o
  // topo do celular ficaria uma faixa clara acesa em cima da tela escura.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1311" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Decide o tema antes de a tela ser pintada. Se ficasse no React, a
            pagina apareceria clara e piscaria para escura no carregamento.
            O suppressHydrationWarning acima e por causa disto: o atributo
            existe no navegador e nao no HTML que veio do servidor. */}
        <script dangerouslySetInnerHTML={{ __html: scriptDoTema }} />
      </head>
      <body className="min-h-full flex flex-col bg-shell">
        <ToastProvider>{children}</ToastProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
