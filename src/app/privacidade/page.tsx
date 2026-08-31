import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/legal/pagina-legal";
import { dadosLegais, SUBOPERADORES } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como o ConfecControl trata os dados da sua confecção e dos seus clientes: finalidades, bases legais, prazos de guarda e os seus direitos pela LGPD.",
  alternates: { canonical: "/privacidade" },
};

const SUMARIO = [
  { id: "aplicacao", texto: "A quem esta política se aplica" },
  { id: "definicoes", texto: "Definições" },
  { id: "papeis", texto: "Quem é controlador e quem é operador" },
  { id: "tratamentos", texto: "Dados, finalidades e bases legais" },
  { id: "criancas", texto: "Dados de crianças e adolescentes" },
  { id: "compartilhamento", texto: "Com quem compartilhamos" },
  { id: "internacional", texto: "Transferência internacional" },
  { id: "prazos", texto: "Por quanto tempo guardamos" },
  { id: "direitos", texto: "Seus direitos e como exercê-los" },
  { id: "encarregado", texto: "Encarregado de dados" },
  { id: "seguranca", texto: "Segurança da informação" },
  { id: "incidentes", texto: "Incidentes de segurança" },
  { id: "cookies", texto: "Cookies e armazenamento local" },
  { id: "automatizadas", texto: "Decisões automatizadas" },
  { id: "alteracoes", texto: "Alterações desta política" },
  { id: "lei", texto: "Legislação aplicável" },
];

/** Uma linha da tabela de tratamentos. */
function Tratamento({
  dados,
  finalidade,
  base,
  artigo,
}: {
  dados: string;
  finalidade: string;
  base: string;
  artigo: string;
}) {
  return (
    <tr>
      <td>{dados}</td>
      <td>{finalidade}</td>
      <td>
        {base}
        <span className="block text-xs text-soft">{artigo}</span>
      </td>
    </tr>
  );
}

export default function PrivacidadePage() {
  const dados = dadosLegais();
  const contato = dados.encarregadoEmail;
  const operador = dados.nomeControlador ?? "o responsável pelo ConfecControl";

  return (
    <PaginaLegal
      titulo="Política de Privacidade"
      resumo="O que o ConfecControl coleta, com qual fundamento legal, por quanto tempo guarda e o que você pode exigir a qualquer momento."
      sumario={SUMARIO}
    >
      <h2 id="aplicacao">1. A quem esta política se aplica</h2>
      <p>
        Este documento vale para o ConfecControl — o sistema de gestão para confecções acessível em
        confeccontrol.com — e alcança três grupos de pessoas:
      </p>
      <ul>
        <li>
          <strong>A confecção que contrata</strong> e as pessoas que a representam.
        </li>
        <li>
          <strong>Quem trabalha na confecção</strong> e usa o sistema com um acesso próprio.
        </li>
        <li>
          <strong>Os clientes da confecção</strong>, cujos dados ela cadastra para produzir e
          cobrar.
        </li>
      </ul>
      <p>
        Se você é cliente de uma confecção e chegou aqui, a seção{" "}
        <a href="#papeis">Quem é controlador e quem é operador</a> explica a quem dirigir o seu
        pedido — e a resposta, na maior parte das vezes, é a própria confecção.
      </p>

      <h2 id="definicoes">2. Definições</h2>
      <p>Os termos abaixo têm o significado que a LGPD lhes dá (art. 5º):</p>
      <ul>
        <li>
          <strong>Dado pessoal:</strong> informação relacionada a pessoa natural identificada ou
          identificável — nome, CPF, telefone, endereço.
        </li>
        <li>
          <strong>Titular:</strong> a pessoa a quem o dado se refere.
        </li>
        <li>
          <strong>Tratamento:</strong> qualquer operação com o dado — coletar, guardar, usar,
          compartilhar, eliminar.
        </li>
        <li>
          <strong>Controlador:</strong> quem decide o que tratar e para quê.
        </li>
        <li>
          <strong>Operador:</strong> quem trata em nome do controlador, seguindo as instruções dele.
        </li>
        <li>
          <strong>Encarregado:</strong> a pessoa indicada para ser o canal entre titulares, a
          empresa e a ANPD (art. 41).
        </li>
        <li>
          <strong>ANPD:</strong> Autoridade Nacional de Proteção de Dados.
        </li>
      </ul>

      <h2 id="papeis">3. Quem é controlador e quem é operador</h2>
      <p>
        Esta é a distinção mais importante do documento, porque define a quem cada pessoa deve
        recorrer.
      </p>
      <div className="tabela-legal">
        <table>
          <thead>
            <tr>
              <th>Situação</th>
              <th>Controlador</th>
              <th>Operador</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Dados dos clientes da confecção, pedidos, valores, arquivos</td>
              <td>A confecção contratante</td>
              <td>{operador}</td>
            </tr>
            <tr>
              <td>Dados de cadastro da própria confecção e dos seus funcionários</td>
              <td>{operador}</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Na prática: quando uma confecção cadastra o CPF de um cliente para emitir nota, foi ela quem
        decidiu coletar aquele dado e é ela quem responde perante aquela pessoa. Nós guardamos e
        processamos a mando dela, e não usamos aquilo para nenhuma outra finalidade — nem para
        beneficiar outra confecção, nem para vender a terceiros.
      </p>
      <p>
        Quando a confecção encerra o contrato, ela continua sendo a controladora: é dela a decisão
        sobre exportar ou eliminar o que cadastrou.
      </p>

      <h2 id="tratamentos">4. Dados, finalidades e bases legais</h2>
      <p>
        A LGPD exige que todo tratamento tenha uma base legal (art. 7º). O quadro abaixo diz o que
        tratamos, para quê e com qual fundamento.
      </p>

      <h3>4.1. Da confecção contratante</h3>
      <div className="tabela-legal">
        <table>
          <thead>
            <tr>
              <th>Dados</th>
              <th>Finalidade</th>
              <th>Base legal</th>
            </tr>
          </thead>
          <tbody>
            <Tratamento
              dados="Razão social, CNPJ, endereço, telefone, e-mail"
              finalidade="Executar o contrato, faturar e prestar suporte"
              base="Execução de contrato"
              artigo="art. 7º, V"
            />
            <Tratamento
              dados="Nome, e-mail, cargo e senha (cifrada) de cada funcionário"
              finalidade="Dar acesso ao sistema e separar o que cada cargo enxerga"
              base="Execução de contrato"
              artigo="art. 7º, V"
            />
            <Tratamento
              dados="Registro de quem moveu cada pedido, e quando"
              finalidade="Histórico de produção e apuração de responsabilidade interna"
              base="Legítimo interesse do controlador"
              artigo="art. 7º, IX"
            />
          </tbody>
        </table>
      </div>

      <h3>4.2. Dos clientes da confecção</h3>
      <p>
        Aqui a confecção é a controladora, e a base legal é escolhida por ela. As indicações abaixo
        são as que correspondem ao uso normal do sistema:
      </p>
      <div className="tabela-legal">
        <table>
          <thead>
            <tr>
              <th>Dados</th>
              <th>Finalidade</th>
              <th>Base legal</th>
            </tr>
          </thead>
          <tbody>
            <Tratamento
              dados="Nome, contato, endereço"
              finalidade="Produzir, entregar e cobrar o pedido"
              base="Execução de contrato ou procedimento preliminar"
              artigo="art. 7º, V"
            />
            <Tratamento
              dados="Pedidos, itens, tamanhos, valores e pagamentos"
              finalidade="Executar a produção e controlar o recebimento"
              base="Execução de contrato"
              artigo="art. 7º, V"
            />
            <Tratamento
              dados="Arquivos enviados: arte, molde, fotos da produção"
              finalidade="Produzir a peça conforme o combinado e registrar o que foi feito"
              base="Execução de contrato"
              artigo="art. 7º, V"
            />
            <Tratamento
              dados="Acesso ao portal do cliente (e-mail e senha cifrada), quando a confecção ativa"
              finalidade="Permitir que o cliente acompanhe pedidos e faça solicitações"
              base="Execução de contrato"
              artigo="art. 7º, V"
            />
          </tbody>
        </table>
      </div>

      <h3>4.3. De quem visita o site</h3>
      <p>
        O site público não usa cookie de publicidade nem rastreamento entre sites. Registros
        técnicos de acesso são gerados pela hospedagem para segurança e diagnóstico, com fundamento
        no legítimo interesse (art. 7º, IX) e, quanto aos registros de conexão, no Marco Civil da
        Internet (Lei nº 12.965/2014, art. 15).
      </p>

      <h2 id="criancas">5. Dados de crianças e adolescentes</h2>
      <p>
        Uma confecção de uniforme escolar quase sempre acaba tratando dados de crianças — nome e
        tamanho de aluno, por exemplo. A LGPD trata isso com regra própria (art. 14): o tratamento
        deve atender ao melhor interesse da criança e, no caso de crianças, depende em regra de
        consentimento específico de pelo menos um dos pais ou do responsável legal.
      </p>
      <p>
        <strong>O que isso significa na prática:</strong> quem coleta esses dados é a confecção
        (ou a escola que contrata a confecção), e é dela a responsabilidade de ter o fundamento
        adequado. O sistema não pede nem incentiva o cadastro de dados de criança além do
        necessário para produzir a peça, e recomendamos registrar apenas o indispensável — em
        muitos casos, o nome da escola e a grade de tamanhos bastam, sem nomes individuais.
      </p>

      <h2 id="compartilhamento">6. Com quem compartilhamos</h2>
      <p>
        Apenas com quem é necessário para o sistema funcionar, e cada um trata somente o que precisa:
      </p>
      <div className="tabela-legal">
        <table>
          <thead>
            <tr>
              <th>Quem</th>
              <th>Para quê</th>
              <th>Onde fica</th>
              <th>O que recebe</th>
            </tr>
          </thead>
          <tbody>
            {SUBOPERADORES.map((s) => (
              <tr key={s.nome}>
                <td>{s.nome}</td>
                <td>{s.papel}</td>
                <td>{s.local}</td>
                <td>{s.dados}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Além desses, os dados podem ser compartilhados com autoridade pública quando houver ordem
        legal ou judicial que nos obrigue, e com advogados e contadores quando necessário para
        exercer direito em processo (art. 7º, VI).
      </p>
      <p>
        <strong>Não vendemos, alugamos nem cedemos dados para publicidade</strong>, e não usamos os
        dados de uma confecção em benefício de outra.
      </p>

      <h2 id="internacional">7. Transferência internacional</h2>
      <p>
        Os dados do sistema ficam armazenados <strong>no Brasil</strong>: a aplicação roda na região
        de São Paulo e o banco de dados e os arquivos também estão em São Paulo.
      </p>
      <p>
        A única exceção é o monitoramento de erros, quando ativado, que é operado por empresa
        sediada nos Estados Unidos. Esse envio é limitado a informação técnica — rota, mensagem e
        pilha do erro — e passa por uma limpeza que remove corpo da requisição, cookies, parâmetros
        de busca e identificação do usuário antes do envio. A transferência se apoia no art. 33 da
        LGPD e é restrita ao necessário para manter o serviço em funcionamento.
      </p>

      <h2 id="prazos">8. Por quanto tempo guardamos</h2>
      <div className="tabela-legal">
        <table>
          <thead>
            <tr>
              <th>Dados</th>
              <th>Prazo</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cadastros e pedidos</td>
              <td>Enquanto durar o contrato</td>
              <td>Necessários para o serviço</td>
            </tr>
            <tr>
              <td>Dados após o encerramento</td>
              <td>Período de exportação combinado, e então eliminação</td>
              <td>Fim da finalidade (art. 15, I)</td>
            </tr>
            <tr>
              <td>Registros de acesso à aplicação</td>
              <td>6 meses, no mínimo</td>
              <td>Marco Civil da Internet, art. 15</td>
            </tr>
            <tr>
              <td>Itens na lixeira do sistema</td>
              <td>Até a exclusão definitiva pelo dono da empresa</td>
              <td>Permitir recuperação de exclusão acidental</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Findo o prazo, os dados são eliminados, salvo quando a conservação for autorizada pelo art.
        16 da LGPD — cumprimento de obrigação legal, estudo por órgão de pesquisa com
        anonimização, transferência a terceiro com observância da lei, ou uso exclusivo nosso em
        forma anonimizada.
      </p>

      <h2 id="direitos">9. Seus direitos e como exercê-los</h2>
      <p>O art. 18 da LGPD garante a você, sobre os seus dados:</p>
      <ul>
        <li>Confirmação de que existe tratamento;</li>
        <li>Acesso aos dados;</li>
        <li>Correção de dado incompleto, inexato ou desatualizado;</li>
        <li>Anonimização, bloqueio ou eliminação de dado desnecessário, excessivo ou tratado em desconformidade com a lei;</li>
        <li>Portabilidade a outro fornecedor, mediante requisição expressa;</li>
        <li>Eliminação dos dados tratados com base no consentimento;</li>
        <li>Informação sobre com quem compartilhamos;</li>
        <li>Informação sobre a possibilidade de não consentir e as consequências disso;</li>
        <li>Revogação do consentimento;</li>
        <li>Revisão de decisão tomada unicamente com base em tratamento automatizado (art. 20).</li>
      </ul>
      <h3>Como pedir</h3>
      <p>
        {contato ? (
          <>
            Escreva para <strong>{contato}</strong>, dizendo qual direito quer exercer. Podemos
            pedir informação adicional para confirmar sua identidade — é uma proteção sua: entregar
            dado pessoal a quem se passa por outra pessoa seria o próprio vazamento.
          </>
        ) : (
          <>O canal de contato para exercício de direitos ainda não foi informado nesta página.</>
        )}
      </p>
      <p>
        Respondemos aos pedidos no prazo previsto no art. 19 da LGPD. Se você é cliente de uma
        confecção que usa o ConfecControl, dirija o pedido primeiro a ela, que é a controladora;
        quando o pedido chegar a nós, encaminhamos e prestamos o apoio técnico necessário.
      </p>
      <p>
        Você também pode peticionar diretamente à <strong>ANPD</strong> (art. 18, § 1º) se entender
        que seus direitos não foram atendidos.
      </p>

      <h2 id="encarregado">10. Encarregado de dados</h2>
      <p>
        {dados.encarregadoNome ? (
          <>
            O encarregado pelo tratamento de dados pessoais é <strong>{dados.encarregadoNome}</strong>
            {contato ? (
              <>
                , e o canal de contato é <strong>{contato}</strong>
              </>
            ) : null}
            . Cabe a ele receber reclamações e comunicações de titulares, prestar esclarecimentos e
            atuar como interlocutor com a ANPD (art. 41, § 2º).
          </>
        ) : (
          <>O encarregado de dados ainda não foi indicado nesta página.</>
        )}
      </p>

      <h2 id="seguranca">11. Segurança da informação</h2>
      <p>
        Adotamos medidas técnicas e administrativas para proteger os dados (art. 46). As principais,
        descritas sem eufemismo:
      </p>
      <ul>
        <li>
          <strong>Senhas nunca são guardadas em texto.</strong> Passam por derivação criptográfica
          com sal, e a comparação é feita em tempo constante.
        </li>
        <li>
          <strong>Sessão em cookie assinado</strong>, inacessível a scripts da página, transmitido
          apenas por conexão cifrada.
        </li>
        <li>
          <strong>Separação por empresa em toda consulta ao banco.</strong> Não depende de
          configuração nem de alguém lembrar: a empresa entra no critério de busca.
        </li>
        <li>
          <strong>Permissão verificada no servidor</strong>, e não apenas escondendo botões na tela.
        </li>
        <li>
          <strong>Arquivos em armazenamento privado</strong>, servidos por links temporários que
          expiram em minutos. O tipo real de cada arquivo é conferido no envio.
        </li>
        <li>
          <strong>Limite de tentativas de acesso</strong>, com bloqueio progressivo, no login da
          equipe, no portal do cliente e na ativação de conta.
        </li>
        <li>
          <strong>Monitoramento sem dados pessoais.</strong> O envio de erros vai com identificação
          de usuário desligada, e corpo da requisição, cookies e parâmetros de busca são removidos
          antes de sair do servidor. Gravação de tela é desativada.
        </li>
      </ul>
      <p>
        Nenhum sistema é inviolável. Estas medidas reduzem risco; não o eliminam.
      </p>

      <h2 id="incidentes">12. Incidentes de segurança</h2>
      <p>
        Se ocorrer incidente de segurança que possa acarretar risco ou dano relevante aos titulares,
        comunicamos a ANPD e os titulares afetados, no prazo e na forma da regulamentação vigente
        (art. 48), informando a natureza dos dados, os titulares envolvidos, as medidas técnicas de
        proteção utilizadas, os riscos e as providências adotadas.
      </p>
      <p>
        Quando o incidente envolver dados sob controle de uma confecção contratante, comunicamos a
        ela imediatamente, para que possa cumprir os deveres que lhe cabem como controladora.
      </p>

      <h2 id="cookies">13. Cookies e armazenamento local</h2>
      <div className="tabela-legal">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Para quê</th>
              <th>Duração</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cookie de sessão</td>
              <td>Manter você conectado ao sistema</td>
              <td>7 dias, ou até sair</td>
            </tr>
            <tr>
              <td>Preferência de tema</td>
              <td>Lembrar se você escolheu claro ou escuro</td>
              <td>Fica no seu navegador até você limpar</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        São estritamente necessários ao funcionamento, por isso não exibimos banner de consentimento
        para eles. <strong>Não usamos cookie de publicidade, de rede social ou de rastreamento entre
        sites.</strong>
      </p>

      <h2 id="automatizadas">14. Decisões automatizadas</h2>
      <p>
        O sistema <strong>não toma decisões automatizadas</strong> que afetem interesses do titular
        na forma do art. 20 da LGPD. Ele calcula prazos, saldos e indicadores, mas quem decide o que
        fazer com aquilo é sempre uma pessoa. Não há criação de perfil de comportamento nem
        pontuação de crédito.
      </p>

      <h2 id="alteracoes">15. Alterações desta política</h2>
      <p>
        Quando houver mudança relevante, publicamos a nova versão nesta página com data e número de
        versão atualizados e avisamos as confecções contratantes pelo sistema ou por e-mail, com
        antecedência razoável. O histórico permite verificar o que valia em cada período.
      </p>

      <h2 id="lei">16. Legislação aplicável</h2>
      <p>
        Aplicam-se a Lei nº 13.709/2018 (LGPD), a Lei nº 12.965/2014 (Marco Civil da Internet) e a
        regulamentação editada pela ANPD, além das demais normas brasileiras cabíveis.
      </p>
      <p>
        Veja também os <Link href="/termos">Termos de Uso</Link>.
      </p>
    </PaginaLegal>
  );
}
