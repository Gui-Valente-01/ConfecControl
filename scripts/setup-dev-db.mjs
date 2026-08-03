// Prepara o banco de DESENVOLVIMENTO: aplica as migrations e cria a empresa
// de demonstração. Roda com: node scripts/setup-dev-db.mjs
//
// Lê a conexão de .env.local (e nunca de .env), justamente para não haver como
// apontar sem querer para o banco de produção. Se .env.local não tiver
// DATABASE_URL, o script para antes de tocar em qualquer coisa.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const ENV_FILE = ".env.local";

function lerEnvLocal() {
  if (!existsSync(ENV_FILE)) return {};
  const vars = {};
  for (const linha of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const limpa = linha.replace(/^﻿/, "").trim();
    if (!limpa || limpa.startsWith("#")) continue;
    const igual = limpa.indexOf("=");
    if (igual === -1) continue;
    const chave = limpa.slice(0, igual).trim();
    let valor = limpa.slice(igual + 1).trim();
    if (valor.startsWith('"') && valor.endsWith('"')) valor = valor.slice(1, -1);
    if (valor.startsWith("'") && valor.endsWith("'")) valor = valor.slice(1, -1);
    vars[chave] = valor;
  }
  return vars;
}

const local = lerEnvLocal();
const url = local.DATABASE_URL;

if (!url) {
  console.error(`
Falta configurar o banco de desenvolvimento.

1. Crie um projeto novo no Supabase (pode ser o plano gratuito).
2. Em Project Settings > Database, copie a "Connection string" (modo Session).
3. Cole no arquivo ${ENV_FILE} deste projeto, assim:

   DATABASE_URL="postgresql://...sua-conexao..."
   DIRECT_URL="postgresql://...a-mesma-conexao..."

4. Rode este comando de novo.

Nada foi alterado.`);
  process.exit(1);
}

// Trava de segurança: o banco de desenvolvimento não pode ser o de produção.
const producao = (process.env.DATABASE_URL_PRODUCAO ?? "").trim();
const envArquivo = existsSync(".env") ? readFileSync(".env", "utf8") : "";
const urlProducao = producao || (envArquivo.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m)?.[1] ?? "");

function projeto(conexao) {
  const usuario = decodeURIComponent(new URL(conexao).username ?? "");
  return usuario.split(".")[1] ?? usuario;
}

try {
  if (urlProducao && projeto(url) === projeto(urlProducao)) {
    console.error(`
PARADO: o ${ENV_FILE} está apontando para o MESMO projeto do .env (produção).

O objetivo do banco de desenvolvimento é justamente ser outro. Crie um projeto
separado no Supabase e use a conexão dele.

Nada foi alterado.`);
    process.exit(1);
  }
} catch {
  console.error(`A conexão em ${ENV_FILE} não parece uma URL válida do Postgres.`);
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: local.DIRECT_URL || url };

console.log(`Banco de desenvolvimento: projeto ${projeto(url)}\n`);

console.log("1/2  Aplicando as migrations...");
execFileSync("npx", ["prisma", "migrate", "deploy"], { env, stdio: "inherit", shell: true });

console.log("\n2/2  Criando a empresa de demonstração...");
execFileSync(process.execPath, ["scripts/seed-demo.mjs"], { env, stdio: "inherit" });

console.log(`
Pronto. O ${ENV_FILE} manda no desenvolvimento local, então "npm run dev" agora
usa este banco. O site publicado continua no banco de produção, intocado.`);
