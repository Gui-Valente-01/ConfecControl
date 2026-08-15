// Modo demonstração: deixa qualquer visitante entrar no sistema com uma
// confecção fictícia, sem cadastro e sem falar com vendedor.
//
// Nasce DESLIGADO. Sem a variável de ambiente, o botão não aparece e as ações
// recusam rodar — então subir este código para produção não muda nada até
// alguém decidir ligar. É de propósito: a demonstração apaga e recria dados,
// e isso não pode acontecer por acidente de deploy.

export { EMPRESA_DEMO } from "@/lib/seed-demo";

/** A demonstração só existe onde foi explicitamente ligada. */
export function demoHabilitada(): boolean {
  return process.env.DEMO_HABILITADA === "true";
}
