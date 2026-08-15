// Gera a imagem que aparece quando o link do site é colado no WhatsApp.
//
// Sem ela o link vira uma linha de texto sem graça — e boa parte da divulgação
// do produto acontece exatamente por link colado em grupo de confecção.
//
// Os ÍCONES não passam por aqui: eles são desenhados em tempo de execução em
// src/app/icons/*/route.ts, a partir de src/lib/pwa-icon.tsx. Criar um PNG de
// ícone dentro de public/ colide com aquelas rotas e derruba as duas coisas.
//
// Rodar depois de mexer na marca ou na frase de apresentação:
//   node scripts/gerar-og.mjs

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

// As mesmas cores do globals.css e da marca em src/lib/pwa-icon.tsx. Aqui o
// código precisa ser literal: o arquivo vira PNG, e PNG não lê variável de CSS.
const TINTA = "#111a16";
const PRIMARIA = "#087f7d";
const CREME = "#f4f6f5";
const APAGADO = "#9eb1a8";

/**
 * A marca: o "C" teal com a conta creme, a mesma de pwa-icon.tsx.
 *
 * Vem desenhada num quadrado de 512 e é reduzida por transformação, para o
 * traço não precisar ser recalculado quando o tamanho mudar.
 */
function marca(x, y, lado) {
  const escala = lado / 512;
  return `<g transform="translate(${x} ${y}) scale(${escala})">
    <path d="M348 176 A104 104 0 1 0 348 336" fill="none" stroke="${PRIMARIA}" stroke-width="40" stroke-linecap="round"/>
    <circle cx="366" cy="256" r="26" fill="${CREME}"/>
  </g>`;
}

const [largura, altura] = [1200, 630];

const svg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}">
    <rect width="${largura}" height="${altura}" fill="${TINTA}"/>
    <rect x="0" y="0" width="${largura}" height="10" fill="${PRIMARIA}"/>
    ${marca(74, 122, 190)}
    <text x="96" y="380" font-family="Segoe UI, Arial, Helvetica, sans-serif"
          font-size="78" font-weight="700" fill="${CREME}">ConfecControl</text>
    <text x="96" y="450" font-family="Segoe UI, Arial, Helvetica, sans-serif"
          font-size="38" fill="${APAGADO}">Gestão de produção para confecções</text>
    <text x="96" y="530" font-family="Segoe UI, Arial, Helvetica, sans-serif"
          font-size="30" fill="${PRIMARIA}">Pedidos · Produção · Estoque · Cobrança</text>
  </svg>`,
);

const destino = join(raiz, "public", "og.png");
await sharp(svg).png().toFile(destino);
console.log("ok  public/og.png");
