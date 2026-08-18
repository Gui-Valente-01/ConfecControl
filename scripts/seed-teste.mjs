// Cria (ou recria) a confecção de teste pela linha de comando.
//
//   npm run db:seed-teste
//
// O cenário em si mora em src/lib/seed-teste.ts. Aqui só entram as
// coisas que a linha de comando precisa: abrir a conexão, dizer qual hash de
// senha usar e imprimir os logins no fim.
//
// A flag --experimental-strip-types (já no npm script) é o que permite o Node
// carregar o arquivo TypeScript direto, sem etapa de build.

import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { EMPRESA_TESTE, recriarEmpresaTeste } from "../src/lib/seed-teste.ts";

// Tranca contra rodar no banco errado.
//
// A ordem das flags --env-file decide quem vence, e é fácil inverter sem
// perceber: foi assim que este script já criou a empresa fictícia direto no
// Postgres de produção. Sem "--producao" escrito à mão, ele só aceita banco
// local — e diz para onde estava apontando, em vez de falhar em silêncio.
const url = process.env.DATABASE_URL ?? "";
const host = url.match(/@([^:/?]+)/)?.[1] ?? "(sem DATABASE_URL)";
const eLocal = /^(localhost|127\.0\.0\.1|host\.docker\.internal)$/.test(host);

if (!eLocal && !process.argv.includes("--producao")) {
  console.error(`\nRecusando rodar: "${host}" não é um banco local.`);
  console.error("Este script APAGA e recria a empresa de teste.");
  console.error("Se for mesmo isso que você quer, repita com --producao no fim.\n");
  process.exit(1);
}

console.log(`Banco: ${host}${eLocal ? " (local)" : " (PRODUÇÃO)"}`);

const prisma = new PrismaClient();

// Mesmo formato de src/lib/auth.ts (salt:hash em scrypt). Está repetido aqui
// porque aquele arquivo importa coisas do Next, que não existem fora do site.
function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

try {
  const resumo = await recriarEmpresaTeste({
    prisma,
    hashPassword,
    // Fora de produção o next.config libera as fotos de exemplo.
    comFotos: process.env.NODE_ENV !== "production",
  });

  console.log("\n=== EMPRESA DE TESTE CRIADA ===");
  console.log("Empresa:", EMPRESA_TESTE.nome);
  console.log("Pedidos:", resumo.pedidos);
  console.log(`\nEquipe (senha: ${EMPRESA_TESTE.senhaEquipe}):`);
  console.log(`  dono         ${EMPRESA_TESTE.emailDono}`);
  console.log("  gerente      gerente@costuraviva.com");
  console.log("  produção     producao@costuraviva.com");
  console.log("  financeiro   financeiro@costuraviva.com");
  console.log("  vendas       vendas@costuraviva.com");
  console.log("\nPortal do cliente (/portal/entrar):");
  console.log(`  marta@costuraviva.com  |  senha: ${EMPRESA_TESTE.senhaPortal}`);
  console.log("\nOK.");
} catch (erro) {
  console.error(erro);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
