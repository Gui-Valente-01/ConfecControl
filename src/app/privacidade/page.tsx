import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/legal/pagina-legal";
import { dadosLegais } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como o ConfecControl trata os dados da sua confecção e dos seus clientes, e quais são os seus direitos pela LGPD.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacidadePage() {
  const dados = dadosLegais();
  const contato = dados.emailPrivacidade;

  return (
    <PaginaLegal
      titulo="Política de Privacidade"
      resumo="O que o ConfecControl guarda, por que guarda e o que você pode exigir a qualquer momento."
    >
      <h2>1. Quem é quem nesta política</h2>
      <p>
        O ConfecControl é um sistema de gestão usado por confecções. Isso cria duas relações
        diferentes, e a lei trata cada uma de um jeito:
      </p>
      <ul>
        <li>
          <strong>A sua confecção é a controladora</strong> dos dados que ela cadastra: clientes,
          pedidos, valores, fotos. É ela quem decide o que coletar e por quê.
        </li>
        <li>
          <strong>Nós somos operadores</strong> desses dados: guardamos e processamos em nome dela,
          seguindo as instruções dela, e não usamos essas informações para outra finalidade.
        </li>
      </ul>
      <p>
        Quando a sua confecção cadastra o CPF de um cliente para emitir nota, quem responde perante
        aquele cliente é ela. Nós respondemos por manter aquilo seguro e disponível.
      </p>

      <h2>2. O que o sistema guarda</h2>
      <h3>Da confecção que contrata</h3>
      <ul>
        <li>Nome da empresa, CNPJ, endereço, telefone e e-mail.</li>
        <li>Nome, e-mail, cargo e senha (guardada de forma cifrada) de cada funcionário.</li>
        <li>Dados fiscais, quando o módulo de nota fiscal é usado.</li>
      </ul>

      <h3>Dos clientes da confecção</h3>
      <ul>
        <li>Nome, contato, CPF ou CNPJ e endereço.</li>
        <li>Pedidos, itens, valores e pagamentos.</li>
        <li>Arquivos enviados: arte, molde, fotos da produção.</li>
      </ul>

      <h3>De uso do sistema</h3>
      <ul>
        <li>Registro de quem moveu cada pedido e quando, para o histórico de produção.</li>
        <li>Relatórios de erro, quando algo quebra. Eles vão sem dados pessoais.</li>
      </ul>

      <h2>3. O que o sistema NÃO faz</h2>
      <ul>
        <li>Não vende, aluga nem compartilha dados com anunciantes.</li>
        <li>Não usa os dados de uma confecção para beneficiar outra.</li>
        <li>Não grava a tela de quem usa o sistema.</li>
        <li>Não envia dados de cliente para os relatórios de erro.</li>
      </ul>

      <h2>4. Separação entre empresas</h2>
      <p>
        Cada confecção só enxerga os próprios dados. Essa separação não depende de configuração:
        toda consulta ao banco filtra pela empresa de quem está logado, e cada funcionário vê apenas
        o que o cargo dele permite. Arquivos ficam em armazenamento privado, acessíveis por links
        temporários que expiram em minutos.
      </p>

      <h2>5. Com quem os dados são compartilhados</h2>
      <p>Apenas com quem é necessário para o sistema funcionar:</p>
      <ul>
        <li><strong>Hospedagem e banco de dados:</strong> a infraestrutura onde o sistema roda.</li>
        <li><strong>Monitoramento de erros:</strong> recebe a rota e a pilha do erro, sem dados pessoais.</li>
        <li>
          <strong>Provedor fiscal:</strong> quando a confecção emite nota, os dados exigidos pela
          legislação são enviados ao provedor e à SEFAZ. Isso é obrigação legal, não escolha nossa.
        </li>
      </ul>

      <h2>6. Por quanto tempo</h2>
      <p>
        Enquanto durar o contrato. Depois do encerramento, os dados ficam disponíveis por um período
        para exportação e então são apagados — exceto o que a lei obrigar a guardar, como documentos
        fiscais, que têm prazo próprio de guarda.
      </p>
      <p>
        Dentro do sistema, o que é apagado vai para a lixeira e pode ser recuperado; a exclusão
        definitiva é uma ação separada e só o dono da empresa pode fazê-la.
      </p>

      <h2>7. Seus direitos pela LGPD</h2>
      <p>
        A Lei Geral de Proteção de Dados (Lei nº 13.709/2018) garante a você, sobre os seus dados
        pessoais:
      </p>
      <ul>
        <li>Saber se tratamos seus dados e quais são.</li>
        <li>Corrigir dado incompleto ou desatualizado.</li>
        <li>Pedir anonimização, bloqueio ou eliminação de dado desnecessário.</li>
        <li>Pedir a portabilidade para outro fornecedor.</li>
        <li>Revogar consentimento.</li>
        <li>Saber com quem compartilhamos.</li>
      </ul>
      <p>
        Se você é cliente de uma confecção que usa o ConfecControl, o pedido deve ser feito
        primeiro a ela, que é a controladora. Nós ajudamos a atender.
      </p>

      <h2>8. Segurança</h2>
      <p>
        Senha guardada com derivação criptográfica, nunca em texto. Sessão em cookie assinado e
        inacessível a scripts. Conexão sempre cifrada. Arquivos em armazenamento privado. Limite de
        tentativas de acesso, com bloqueio progressivo.
      </p>
      <p>
        Nenhum sistema é imune. Em caso de incidente que possa gerar risco relevante, comunicamos os
        afetados e a ANPD, como manda a lei.
      </p>

      <h2>9. Cookies</h2>
      <p>
        O sistema usa apenas o essencial: um cookie de sessão, para manter você conectado, e a
        preferência de tema (claro ou escuro), guardada no próprio navegador. Não há cookie de
        publicidade nem rastreamento entre sites.
      </p>

      <h2>10. Como falar sobre privacidade</h2>
      <p>
        {contato ? (
          <>
            Escreva para <strong>{contato}</strong>. Respondemos no prazo da lei.
          </>
        ) : (
          <>O canal de contato para assuntos de privacidade ainda não foi informado nesta página.</>
        )}
      </p>
      <p>
        Veja também os <Link href="/termos">Termos de Uso</Link>.
      </p>
    </PaginaLegal>
  );
}
