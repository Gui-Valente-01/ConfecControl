import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/legal/pagina-legal";
import { dadosLegais } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "As condições de uso do ConfecControl: contratação, obrigações de cada parte, titularidade dos dados, responsabilidade e encerramento.",
  alternates: { canonical: "/termos" },
};

const SUMARIO = [
  { id: "definicoes", texto: "Definições" },
  { id: "objeto", texto: "Objeto" },
  { id: "contratacao", texto: "Contratação e ativação" },
  { id: "acessos", texto: "Acessos e responsabilidade da equipe" },
  { id: "licenca", texto: "Licença de uso e propriedade intelectual" },
  { id: "dados", texto: "Titularidade dos dados" },
  { id: "protecao", texto: "Proteção de dados pessoais" },
  { id: "obrigacoes", texto: "Obrigações do contratante" },
  { id: "nossas", texto: "Nossas obrigações" },
  { id: "disponibilidade", texto: "Disponibilidade e suporte" },
  { id: "pagamento", texto: "Preço, pagamento e reajuste" },
  { id: "vigencia", texto: "Vigência, suspensão e rescisão" },
  { id: "responsabilidade", texto: "Limitação de responsabilidade" },
  { id: "confidencialidade", texto: "Confidencialidade" },
  { id: "alteracoes", texto: "Alterações destes termos" },
  { id: "gerais", texto: "Disposições gerais" },
];

export default function TermosPage() {
  const dados = dadosLegais();
  const nos = dados.nomeControlador ?? "o responsável pelo ConfecControl";

  return (
    <PaginaLegal
      titulo="Termos de Uso"
      resumo="As regras do serviço, escritas para serem entendidas sem advogado do lado — e precisas o bastante para valerem com um."
      sumario={SUMARIO}
    >
      <h2 id="definicoes">1. Definições</h2>
      <ul>
        <li><strong>ConfecControl</strong> ou <strong>Sistema:</strong> a plataforma de gestão para confecções acessível em confeccontrol.com.</li>
        <li><strong>Contratada:</strong> {nos}, que fornece o Sistema.</li>
        <li><strong>Contratante:</strong> a confecção que contrata o Sistema.</li>
        <li><strong>Usuário:</strong> a pessoa que acessa o Sistema com credencial criada pelo Contratante.</li>
        <li><strong>Proposta:</strong> o documento comercial aceito pelo Contratante, que define plano, módulos, preço e prazo.</li>
      </ul>

      <h2 id="objeto">2. Objeto</h2>
      <p>
        Estes termos regem o uso do ConfecControl, fornecido como serviço pela internet, para
        controle de pedidos, produção, estoque de peças e cobrança.
      </p>
      <p>
        O Sistema é fornecido no modelo de assinatura: não há venda de licença perpétua, entrega de
        código-fonte nem instalação em servidor do Contratante, salvo se a Proposta disser o
        contrário.
      </p>
      <p>
        <strong>
          O Sistema não emite documentos fiscais e não se comunica com a SEFAZ nem com provedor
          fiscal.
        </strong>{" "}
        Não há geração de NF-e, NFS-e, XML ou DANFE, e o Sistema não apura tributos. A emissão
        fiscal e as obrigações acessórias continuam inteiramente a cargo do Contratante e do seu
        contador. O Sistema também não é loja virtual, frente de caixa ou integração com
        marketplace, e depende de conexão com a internet para funcionar.
      </p>

      <h2 id="contratacao">3. Contratação e ativação</h2>
      <p>
        A contratação é feita diretamente com a Contratada, mediante aceite da Proposta. Concluída a
        contratação, o Contratante recebe um código de ativação e cria a conta da sua confecção.
      </p>
      <p>
        <strong>Não há cadastro automático nem período de teste gratuito anônimo.</strong> Se
        qualquer material de divulgação der a entender o contrário, prevalece o que está escrito
        aqui e na Proposta.
      </p>
      <p>
        O aceite destes termos ocorre no momento da ativação da conta e vincula o Contratante e
        todos os seus Usuários.
      </p>

      <h2 id="acessos">4. Acessos e responsabilidade da equipe</h2>
      <p>
        Cada Usuário recebe credencial própria, com cargo definido pelo Contratante, que determina o
        que aquela pessoa pode ver e fazer.
      </p>
      <p>O Contratante é responsável por:</p>
      <ul>
        <li>Manter as credenciais em sigilo e não compartilhá-las entre pessoas;</li>
        <li>Atribuir a cada Usuário o cargo adequado à sua função;</li>
        <li>Desativar imediatamente o acesso de quem deixar a equipe;</li>
        <li>Todos os atos praticados com as credenciais da sua conta.</li>
      </ul>
      <p>
        A desativação é feita na própria tela de funcionários e tem efeito imediato. Se houver
        suspeita de acesso indevido, o Contratante deve trocar as senhas afetadas e nos comunicar.
      </p>

      <h2 id="licenca">5. Licença de uso e propriedade intelectual</h2>
      <p>
        Durante a vigência do contrato, o Contratante recebe licença de uso do Sistema — não
        exclusiva, intransferível e limitada à sua própria operação.
      </p>
      <p>É vedado, salvo autorização expressa:</p>
      <ul>
        <li>Sublicenciar, revender, alugar ou ceder o acesso a terceiros;</li>
        <li>Realizar engenharia reversa, descompilar ou tentar obter o código-fonte;</li>
        <li>Copiar a interface, a estrutura ou os textos do Sistema para criar produto concorrente;</li>
        <li>Usar meios automatizados para extrair dados em massa de forma que comprometa o serviço.</li>
      </ul>
      <p>
        O software, a marca, o desenho das telas e a documentação permanecem de titularidade da
        Contratada. Sugestões de melhoria enviadas pelo Contratante podem ser implementadas sem
        gerar direito de exclusividade ou remuneração, e sem que isso transfira ao Contratante
        qualquer direito sobre o Sistema.
      </p>

      <h2 id="dados">6. Titularidade dos dados</h2>
      <p>
        <strong>Os dados inseridos no Sistema são do Contratante.</strong> Clientes, pedidos,
        valores, arquivos e histórico continuam pertencendo a ele. A Contratada os armazena e
        processa exclusivamente para prestar o serviço.
      </p>
      <p>
        A Contratada não utiliza os dados de um Contratante em benefício de outro, não os
        comercializa e não os emprega para finalidade diversa da execução do contrato. Dados
        agregados e anonimizados, dos quais não seja possível identificar pessoa ou empresa, podem
        ser usados para melhoria do produto.
      </p>
      <p>
        Durante a vigência e por prazo razoável após o encerramento, o Contratante pode exportar
        seus dados em formato legível por máquina.
      </p>

      <h2 id="protecao">7. Proteção de dados pessoais</h2>
      <p>
        No tratamento de dados pessoais de clientes e terceiros inseridos no Sistema, o{" "}
        <strong>Contratante atua como controlador</strong> e a{" "}
        <strong>Contratada como operadora</strong>, nos termos da LGPD (Lei nº 13.709/2018).
      </p>
      <p>A Contratada obriga-se a:</p>
      <ul>
        <li>Tratar os dados apenas conforme as instruções do Contratante e para executar o contrato;</li>
        <li>Adotar as medidas de segurança descritas na <Link href="/privacidade">Política de Privacidade</Link>;</li>
        <li>Manter sigilo, inclusive após o término do contrato;</li>
        <li>Auxiliar o Contratante no atendimento a pedidos de titulares e a requisições da ANPD;</li>
        <li>Comunicar ao Contratante, sem demora, incidente de segurança que envolva seus dados;</li>
        <li>Eliminar ou devolver os dados ao fim do tratamento, ressalvada a guarda obrigatória por lei.</li>
      </ul>
      <p>O Contratante, por sua vez, declara que:</p>
      <ul>
        <li>Possui base legal adequada para os dados que insere no Sistema;</li>
        <li>Informa os seus titulares sobre o tratamento, quando exigido;</li>
        <li>Não insere dados pessoais sensíveis sem necessidade e sem fundamento legal próprio;</li>
        <li>Observa a regra específica da LGPD para dados de crianças e adolescentes.</li>
      </ul>
      <p>
        A <Link href="/privacidade">Política de Privacidade</Link> integra estes termos para todos os
        efeitos.
      </p>

      <h2 id="obrigacoes">8. Obrigações do contratante</h2>
      <ul>
        <li>Fornecer informações verdadeiras no cadastro e mantê-las atualizadas;</li>
        <li>
          Cumprir as próprias obrigações fiscais e trabalhistas, que não são executadas pelo
          Sistema;
        </li>
        <li>Conferir os dados cadastrais e os valores registrados no Sistema;</li>
        <li>Usar o Sistema conforme a lei e estes termos;</li>
        <li>Não inserir conteúdo ilícito, ofensivo ou que viole direito de terceiro;</li>
        <li>Não tentar burlar limites técnicos, permissões ou a separação entre empresas;</li>
        <li>Pagar os valores contratados nos prazos combinados.</li>
      </ul>

      <h2 id="nossas">9. Nossas obrigações</h2>
      <ul>
        <li>Disponibilizar o Sistema conforme a Proposta;</li>
        <li>Manter as medidas de segurança descritas na Política de Privacidade;</li>
        <li>Prestar suporte pelos canais e horários combinados;</li>
        <li>Comunicar com antecedência razoável paradas programadas e mudanças relevantes;</li>
        <li>Corrigir defeitos que comprometam o funcionamento, em prazo compatível com a gravidade;</li>
        <li>Permitir a exportação dos dados do Contratante.</li>
      </ul>

      <h2 id="disponibilidade">10. Disponibilidade e suporte</h2>
      <p>
        Trabalhamos para manter o Sistema disponível de forma contínua, mas{" "}
        <strong>não garantimos funcionamento ininterrupto ou isento de erros</strong>. A
        disponibilidade depende também de fornecedores de infraestrutura e da conexão do
        Contratante.
      </p>
      <p>Não são consideradas indisponibilidade imputável à Contratada as interrupções por:</p>
      <ul>
        <li>Manutenção programada, comunicada previamente;</li>
        <li>Falha de fornecedor de infraestrutura, energia ou telecomunicações;</li>
        <li>Falha na conexão, no equipamento ou na rede do Contratante;</li>
        <li>Caso fortuito, força maior ou ataque cibernético de terceiros;</li>
        <li>Suspensão prevista nestes termos.</li>
      </ul>
      <p>
        Compromissos específicos de disponibilidade, tempo de resposta e janelas de atendimento, se
        houver, constam da Proposta.
      </p>

      <h2 id="pagamento">11. Preço, pagamento e reajuste</h2>
      <p>
        Valores, forma de pagamento, periodicidade e vencimento são os definidos na Proposta. O
        preço pode ser reajustado anualmente, na menor periodicidade permitida em lei, por índice
        oficial de inflação previsto na Proposta.
      </p>
      <p>
        O atraso no pagamento pode acarretar suspensão do acesso após comunicação prévia, sem
        prejuízo dos encargos contratuais. Durante a suspensão, os dados são preservados; a
        eliminação só ocorre após a rescisão e o decurso do prazo de exportação.
      </p>

      <h2 id="vigencia">12. Vigência, suspensão e rescisão</h2>
      <p>O contrato vigora pelo prazo da Proposta, renovando-se conforme nela previsto.</p>
      <p>
        <strong>O Contratante pode rescindir a qualquer tempo</strong>, mediante comunicação, sem
        multa por parte da Contratada, ressalvados valores já vencidos e eventuais condições
        especiais aceitas na Proposta.
      </p>
      <p>A Contratada pode suspender ou rescindir em caso de:</p>
      <ul>
        <li>Inadimplemento não sanado após comunicação;</li>
        <li>Descumprimento destes termos, especialmente o uso indevido do Sistema;</li>
        <li>Uso que comprometa a segurança, a estabilidade ou os dados de outros contratantes;</li>
        <li>Determinação legal ou judicial.</li>
      </ul>
      <p>
        Encerrado o contrato, o Contratante dispõe de prazo razoável para exportar seus dados, findo
        o qual eles são eliminados, ressalvada a guarda obrigatória por lei.
      </p>

      <h2 id="responsabilidade">13. Limitação de responsabilidade</h2>
      <p>
        A Contratada responde pelos danos diretos comprovadamente decorrentes de falha na prestação
        do serviço que lhe seja imputável.
      </p>
      <p>A Contratada não responde por:</p>
      <ul>
        <li>Informação incorreta inserida pelo Contratante ou por seus Usuários;</li>
        <li>Decisão comercial, contábil ou fiscal tomada com base nas informações do Sistema;</li>
        <li>Uso indevido por pessoa a quem o Contratante concedeu acesso;</li>
        <li>Perda de dados decorrente de exclusão realizada pelo próprio Contratante;</li>
        <li>Indisponibilidade nas hipóteses do item 10;</li>
        <li>Lucros cessantes e danos indiretos.</li>
      </ul>
      <p>
        Salvo dolo, culpa grave ou disposição legal em contrário, a responsabilidade total da
        Contratada fica limitada ao valor pago pelo Contratante nos 12 meses anteriores ao evento.
      </p>
      <p>
        Nenhuma cláusula destes termos afasta direito que a legislação assegure de forma
        irrenunciável.
      </p>

      <h2 id="confidencialidade">14. Confidencialidade</h2>
      <p>
        Cada parte se obriga a manter sigilo sobre informações confidenciais da outra a que tenha
        acesso, usando-as apenas para executar o contrato, e a estendê-las aos seus empregados e
        prestadores. A obrigação subsiste ao término do contrato.
      </p>
      <p>
        Não se considera confidencial a informação que já era pública, que se torne pública sem
        culpa da parte receptora, ou cuja divulgação seja exigida por lei ou ordem de autoridade —
        caso em que a parte obrigada comunicará a outra, quando permitido.
      </p>

      <h2 id="alteracoes">15. Alterações destes termos</h2>
      <p>
        Podemos alterar estes termos para refletir mudança no serviço ou na legislação. Alterações
        relevantes são comunicadas pelo Sistema ou por e-mail com antecedência razoável antes de
        passarem a valer.
      </p>
      <p>
        Se o Contratante não concordar, pode rescindir sem ônus antes da vigência da nova versão. O
        uso continuado após esse prazo caracteriza aceite.
      </p>

      <h2 id="gerais">16. Disposições gerais</h2>
      <p>
        A tolerância quanto ao descumprimento de qualquer cláusula não implica novação nem renúncia.
        A nulidade de uma cláusula não prejudica as demais.
      </p>
      <p>
        Estes termos não criam vínculo societário, trabalhista ou de representação entre as partes.
        A cessão do contrato depende de anuência prévia, salvo em caso de reorganização societária.
      </p>
      <p>
        Aplica-se a legislação brasileira. Fica eleito o foro do domicílio do Contratante para
        dirimir controvérsias, sem prejuízo da tentativa prévia de solução amigável.
      </p>
      <p>
        Veja também a <Link href="/privacidade">Política de Privacidade</Link>.
      </p>
    </PaginaLegal>
  );
}
