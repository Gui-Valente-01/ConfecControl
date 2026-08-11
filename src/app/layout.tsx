import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/toast";
import { PwaRegister } from "@/components/pwa-register";
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

export const metadata: Metadata = {
  title: "ConfecControl",
  description:
    "Pedidos, produção, estoque de peças e cobranças da sua confecção em um lugar só, do corte à entrega.",
  applicationName: "ConfecControl",
  appleWebApp: {
    capable: true,
    title: "ConfecControl",
    statusBarStyle: "default",
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
