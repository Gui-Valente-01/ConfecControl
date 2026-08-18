import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/legal/pagina-legal";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "As regras de uso do ConfecControl: o que está incluído, o que é responsabilidade de cada lado e como encerrar.",
  alternates: { canonical: "/termos" },
};

export default function TermosPage() {
  return (
    <PaginaLegal
      titulo="Termos de Uso"
      resumo="As regras do serviço, escritas para serem entendidas sem advogado do lado."
    >
      <h2>1. O que é o ConfecControl</h2>
      <p>
        Um sistema de gestão para confecções, entregue pela internet. Ele controla pedidos,
        produção, estoque de peças, cobrança e — quando o módulo é contratado — emissão de nota
        fiscal.
      </p>

      <h2>2. Contratação e ativação</h2>
      <p>
        A contratação é feita diretamente conosco. Depois dela, você recebe um código e ativa a
        conta da sua confecção. <strong>Não existe cadastro automático nem teste grátis anônimo</strong>:
        se em algum lugar deste site parecer que existe, vale o que está escrito aqui.
      </p>

      <h2>3. Quem pode usar</h2>
      <p>
        Cada funcionário recebe o próprio acesso, com cargo definido pelo dono da empresa. Você é
        responsável por manter as senhas em sigilo e por retirar o acesso de quem sai da equipe —
        essa retirada é feita na própria tela de funcionários e tem efeito imediato.
      </p>

      <h2>4. Do que você é dono</h2>
      <p>
        <strong>Os dados são seus.</strong> Clientes, pedidos, valores, arquivos: tudo continua
        pertencendo à sua confecção. Nós apenas guardamos e processamos para o sistema funcionar.
        Você pode exportar seus dados enquanto o contrato estiver ativo, e por um período depois do
        encerramento.
      </p>
      <p>
        O software em si, a marca e o código continuam nossos. O contrato dá a você o direito de
        usar o sistema, não de copiá-lo ou revendê-lo.
      </p>

      <h2>5. Do que você é responsável</h2>
      <ul>
        <li>Pela veracidade do que cadastra, inclusive dados fiscais.</li>
        <li>Por ter base legal para tratar os dados dos seus clientes.</li>
        <li>Por conferir documento fiscal antes de emitir: o sistema envia o que você cadastrou.</li>
        <li>Por não usar o sistema para atividade ilícita.</li>
      </ul>

      <h2>6. Nota fiscal</h2>
      <p>
        O módulo fiscal envia à SEFAZ, através de um provedor, os dados que você cadastrou. Duas
        coisas precisam ficar claras:
      </p>
      <ul>
        <li>
          <strong>O sistema não substitui o seu contador.</strong> Regime tributário, alíquota,
          CFOP e classificação fiscal são decisões dele, não nossas. O sistema guarda e transmite o
          que foi configurado.
        </li>
        <li>
          <strong>Nota emitida é documento com efeito legal.</strong> Correção depende de
          cancelamento ou carta de correção, dentro dos prazos da legislação, que variam por estado.
        </li>
      </ul>

      <h2>7. Disponibilidade</h2>
      <p>
        Trabalhamos para manter o sistema no ar, mas não prometemos funcionamento ininterrupto:
        manutenção, falha de infraestrutura de terceiros e caso fortuito acontecem. Avisamos com
        antecedência quando a parada for programada.
      </p>

      <h2>8. Limite de responsabilidade</h2>
      <p>
        Respondemos pelo que está sob nosso controle: manter o sistema funcionando e os dados
        seguros. Não respondemos por prejuízo decorrente de informação errada cadastrada por você,
        de decisão comercial tomada com base nos relatórios, ou de uso indevido por alguém a quem
        você deu acesso.
      </p>

      <h2>9. Encerramento</h2>
      <p>
        Você pode encerrar quando quiser. Podemos encerrar em caso de descumprimento destes termos
        ou falta de pagamento, sempre com aviso prévio e prazo para exportar os dados.
      </p>

      <h2>10. Mudanças nestes termos</h2>
      <p>
        Se algo relevante mudar, avisamos pelo sistema ou por e-mail antes de a mudança valer.
        Continuar usando depois do aviso significa concordar com a nova versão.
      </p>

      <h2>11. Foro</h2>
      <p>
        Aplica-se a lei brasileira. Fica eleito o foro do domicílio do contratante para resolver o
        que não se resolver por conversa.
      </p>

      <p>
        Veja também a <Link href="/privacidade">Política de Privacidade</Link>.
      </p>
    </PaginaLegal>
  );
}
