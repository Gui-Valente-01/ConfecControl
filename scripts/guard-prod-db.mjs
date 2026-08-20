// Trava: recusa comandos de banco quando o alvo é o banco de PRODUÇÃO.
//
// Existe porque a CLI do Prisma lê o .env -- e o .env deste projeto é a
// produção. Ou seja: "npm run db:studio" sem mais nada abre os dados reais do
// cliente, e "db:push" reescreve o schema deles. Não há aviso nenhum na tela
// do Prisma dizendo em qual banco você está.
//
// Como é usada: quem chama passa os mesmos --env-file do comando protegido,
// para esta trava enxergar exatamente a mesma DATABASE_URL que o comando vai
// usar. Assim não há como a trava aprovar um alvo e o comando conectar noutro.
//
//   node --env-file-if-exists=.env scripts/guard-prod-db.mjs
//
// Para operar a produção de propósito (migration de deploy, por exemplo):
//
//   DB_PRODUCAO_LIBERADA=sim npm run db:migrate
//
// A liberação é explícita de propósito: trocar de ambiente por engano custa
// caro e não se desfaz.

import { existsSync, readFileSync } from "node:fs";

const LIBERACAO = "DB_PRODUCAO_LIBERADA";

// Identifica o projeto Supabase pelo usuário da conexão ("postgres.<ref>").
// Mesma leitura usada em scripts/setup-dev-db.mjs. Para um Postgres comum
// (localhost), devolve o próprio usuário -- que nunca vai bater com a ref.
function projeto(conexao) {
  const usuario = decodeURIComponent(new URL(conexao).username ?? "");
  return usuario.split(".")[1] ?? usuario;
}

function identidade(conexao) {
  const url = new URL(conexao);
  return { ref: projeto(conexao), host: url.hostname, banco: url.pathname };
}

// O que é "produção": o .env do repositório, ou DATABASE_URL_PRODUCAO se
// alguém quiser apontar a trava para outro lugar sem editar arquivo.
function urlDeProducao() {
  const explicita = (process.env.DATABASE_URL_PRODUCAO ?? "").trim();
  if (explicita) return explicita;
  const arquivo = existsSync(".env") ? readFileSync(".env", "utf8") : "";
  return arquivo.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m)?.[1] ?? "";
}

const alvo = (process.env.DATABASE_URL ?? "").trim();
const producao = urlDeProducao();

// Sem alvo não há o que proteger, e o próprio comando vai reclamar melhor do
// que nós. Sem produção conhecida, não temos com o que comparar: seguir em
// frente aqui seria fingir uma checagem que não aconteceu.
if (!alvo) process.exit(0);

if (!producao) {
  console.error(`
PARADO: não deu para descobrir qual é o banco de produção.

Esta trava compara o alvo do comando com a DATABASE_URL do .env. Sem esse
arquivo (ou sem ${"DATABASE_URL_PRODUCAO"}) ela não tem como saber se você está
prestes a mexer nos dados reais, e prefere parar a aprovar no escuro.

Nada foi executado.`);
  process.exit(1);
}

let alvoId;
let producaoId;
try {
  alvoId = identidade(alvo);
  producaoId = identidade(producao);
} catch {
  console.error(`
PARADO: a DATABASE_URL não é uma URL válida do Postgres.

Nada foi executado.`);
  process.exit(1);
}

const ehProducao =
  alvoId.ref === producaoId.ref ||
  (alvoId.host === producaoId.host && alvoId.banco === producaoId.banco);

if (!ehProducao) process.exit(0);

if ((process.env[LIBERACAO] ?? "").trim().toLowerCase() === "sim") {
  console.warn(`AVISO: rodando contra a PRODUÇÃO (${alvoId.host}), liberado por ${LIBERACAO}=sim.\n`);
  process.exit(0);
}

console.error(`
PARADO: este comando ia rodar contra o banco de PRODUÇÃO.

  alvo: ${alvoId.host}${alvoId.banco}  (projeto ${alvoId.ref})

São os dados reais de cliente que estão no ar. A CLI do Prisma lê o .env, e o
.env deste projeto é a produção -- por isso o comando parece local e não é.

Se era de propósito (aplicar migration de deploy, por exemplo), repita com a
liberação explícita:

  ${LIBERACAO}=sim npm run <comando>

Nada foi executado.`);
process.exit(1);
