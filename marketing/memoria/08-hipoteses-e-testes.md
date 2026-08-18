# Hipóteses e testes

## Objetivo do funil

Gerar **conversas com empresas que produzem por pedido**, transformar as qualificadas em demonstrações e aprender quais segmentos, dores e provas geram clientes — não apenas cliques.

**Bloqueio zero — resolvido em 18/08/2026.** A página `/planos` chegou a anunciar “Nota fiscal (NF-e) — emissão e acompanhamento com XML e DANFE”, promessa que conflitava com o produto: o provedor é o falso e não há integração com a SEFAZ. A causa não foi um texto escrito à mão — o módulo entrou na lista de recursos e a vitrine lia a lista inteira. Corrigido na origem: vitrine passou a ler só recursos anunciáveis, com teste de regressão. `/planos` está liberada como destino de mídia.

## Oferta inicial

### Principal

**Diagnóstico de 15 minutos + demonstração no fluxo da confecção.**

A conversa deve:

1. identificar segmento e operação;
2. mapear pedido, etapas, equipe, material e cobrança;
3. confirmar requisitos obrigatórios;
4. mostrar apenas o trecho relevante do produto;
5. combinar próximo passo.

### Isca de topo

**Checklist: 10 sinais de que o controle não acompanhou a produção.**

Uso: capturar demanda ainda imatura e criar retargeting consentido. O checklist precisa entregar valor sem esconder conteúdo atrás de perguntas excessivas.

## Funil recomendado

| Etapa | Conteúdo/oferta | Conversão | Dado que volta para marketing |
|---|---|---|---|
| Descoberta | diagnóstico, bastidor e educação | visualização qualificada/salvamento | dor e segmento |
| Consideração | produto em ação e checklist | visita, lead ou mensagem | aderência ao ICP |
| Avaliação | demo, implantação, caso e limites | agendamento | objeção e requisito |
| Decisão | proposta e plano | venda | motivo de ganho/perda |
| Ativação | primeiro pedido e primeira etapa | conta ativada | tempo e fricção |
| Retenção | uso e suporte | atividade/renovação | resultado e cancelamento |

## Estrutura de Meta Ads

Baseada em orientação pública da Meta para Leads, mensagens, formulários, Reels e Advantage+. É um ponto de partida, não garantia de performance.

### Campanha 1 — Prospecção

- Objetivo: Leads.
- Destino A: WhatsApp/mensagem, quando houver atendimento rápido.
- Destino B: formulário instantâneo com qualificação curta.
- Conjuntos: começar consolidado; separar região/vertical apenas quando houver hipótese e volume.
- Público: Brasil ou regiões atendíveis; sinais amplos de confecção/moda/produção podem ser usados como sugestão, sem microsegmentação excessiva.
- Posicionamentos: automáticos como teste inicial.
- Criativos: 9:16 com áudio/legenda e versões 1:1/4:5.
- Frequência: monitorar por audiência e queda criativa, não usar corte universal.

### Campanha 2 — Retargeting

Ativar apenas com volume suficiente.

- pessoas que viram parte relevante dos vídeos;
- visitantes de páginas;
- leads que consentiram e ainda não agendaram;
- excluir clientes e leads já encerrados quando possível.

Mensagem: demonstração, implantação, caso e objeção.

### Formulário inicial

1. O que sua empresa produz?
2. Quantas pessoas usam ou consultam a produção?
3. Como controla hoje?
4. Qual problema quer resolver primeiro?
5. WhatsApp/e-mail com consentimento e finalidade clara.

Evitar pedir CNPJ, faturamento e dados desnecessários no primeiro contato.

## Mensuração

### Eventos

- view_content;
- start_lead;
- lead;
- qualified_lead;
- demo_scheduled;
- demo_attended;
- proposal_sent;
- customer_won;
- activation_first_order;
- activation_first_stage;

Nomes são recomendação; implementar conforme arquitetura real.

### Instrumentação

- UTMs em todo link: source, medium, campaign, content e term.
- Pixel no site, quando houver consentimento aplicável.
- Conversions API em conjunto com Pixel, com revisão de privacidade.
- CRM ou planilha operacional com origem, campanha, criativo, ICP, status e motivo.
- Eventos de fundo enviados somente com base legal, minimização e segurança.
- Testar deduplicação entre navegador e servidor.

### Métricas e fórmulas

- Taxa de lead qualificado = leads no ICP / leads totais.
- Taxa de agendamento = demos agendadas / leads qualificados.
- Comparecimento = demos realizadas / demos agendadas.
- Proposta = propostas / demos realizadas.
- Fechamento = clientes / propostas.
- CAC = gasto de aquisição / clientes ganhos.
- Tempo de ativação = data da primeira ação útil − data da contratação.

CTR, CPM e custo por lead servem para diagnóstico; não substituem qualidade, demonstração e venda.

## 12 hipóteses

| ID | Hipótese | Evidência atual | Público | Criativo/teste | Variável | Métrica principal | Esforço | Impacto esperado | Prioridade | Resultado | Aprendizado |
|---|---|---|---|---|---|---|---|---|---|---|---|
| H01 | Atraso antes da cobrança supera “gestão completa” | dor recorrente em estudos e anúncios C004/C006 | confecção sob encomenda | A01 × controle genérico | gancho | lead qualificado e demo | Médio | Alto | Alta | Não testado | Pendente |
| H02 | Produto real no celular aumenta agendamento | referências C009/C016 e recurso existente | dono com equipe | A04 × imagem estática | formato/prova | demo por lead | Médio | Alto | Alta | Não testado | Pendente |
| H03 | Uniformes respondem melhor a grade/prazo | aderência operacional e C010/C028 | uniformes | A06 × mensagem geral | verticalização | percentual no ICP e demo | Médio | Alto | Alta | Não testado | Pendente |
| H04 | Estamparias respondem melhor a versão/retrabalho | Brinderoz e fluxo do segmento; sem dado próprio | estamparias | A07 × mensagem geral | dor vertical | percentual no ICP e demo | Médio | Alto | Alta | Não testado | Pendente |
| H05 | “Entregou. Recebeu?” supera financeiro genérico | recurso real e narrativa financeira concorrente | proprietário | A05 × “controle financeiro” | headline | lead qualificado | Baixo | Alto | Alta | Não testado | Pendente |
| H06 | Checklist traz mais volume e menor intenção que demo | padrão de captura; sem dado próprio | público frio | A08 × demo direta | oferta | custo por demo e venda | Médio | Médio | Média | Não testado | Pendente |
| H07 | WhatsApp traz mais conversa e menos dados que formulário | funil atual e formatos oficiais Meta | todos os ICPs | mesmo criativo em dois destinos | destino | resposta, qualificação e demo | Médio | Alto | Alta | Não testado | Pendente |
| H08 | Passos claros de implantação reduzem objeção de tempo | barreiras de adoção do SENAI e oferta concorrente | dono/gerente | bloco de implantação × sem bloco | redução de risco | proposta por demo | Baixo | Alto | Alta | Não testado | Pendente |
| H09 | Declarar anti-ICP melhora qualidade | princípio de transparência; sem teste próprio | tráfego de intenção | landing com/sem “não serve” | qualificação | lead no ICP | Médio | Médio | Média | Não testado | Pendente |
| H10 | Caso de cliente supera lista de recursos | referência C017 e princípio de prova social | lead morno | caso autorizado × módulos | prova | demo e proposta | Alto | Alto | Alta | Bloqueado até caso real | Pendente |
| H11 | Linguagem regional reduz custo de demo | concentração regional; sem evidência de compra | regiões priorizadas | landing regional × nacional | localização | demo qualificada | Alto | Médio | Média | Não testado | Pendente |
| H12 | NF-e aumenta fechamento em B2B/B2G | oferta comum em concorrentes; demanda própria desconhecida | leads que precisam emitir | entrevistas; mídia só após lançamento | requisito fiscal | motivo de decisão | Alto | Incerto | Bloqueada | Recurso indisponível | Pendente |

### Registro operacional de cada execução

Antes de ativar um teste, acrescentar:

- responsável;
- campanha/conjunto/anúncio;
- IDs de criativo;
- período;
- limite de investimento aprovado;
- público e exclusões;
- versão da landing;
- evento de conversão;
- regra de decisão;
- resultado por etapa do funil;
- decisão: escalar, iterar, manter ou encerrar.

## Plano A/B

### Princípios

1. Uma variável principal por teste.
2. Mesma oferta, destino e janela ao testar gancho.
3. Pré-registrar hipótese, métrica e regra de decisão.
4. Não declarar vencedor com poucos eventos.
5. Considerar qualidade e vendas, não só clique.
6. Manter registro de peças perdedoras; elas evitam repetição.

### Matriz inicial

| Rodada | Controle | Variação | Variável | Métrica principal |
|---|---|---|---|---|
| 1 | “Gestão para confecções” | “Aja antes de o cliente cobrar” | gancho | lead qualificado |
| 2 | imagem da interface | vídeo de uso no celular | formato/prova | demo por lead |
| 3 | mensagem geral | uniforme: grade e prazo | verticalização | lead no ICP |
| 4 | WhatsApp | formulário instantâneo | destino | demo realizada |
| 5 | demo direta | checklist | oferta | custo por demo |
| 6 | recursos | implantação acompanhada com passos claros | redução de risco | proposta por demo |

### Regra de decisão

Não há número universal. Antes de lançar, definir:

- janela mínima que cubra variação de dias;
- volume mínimo de conversões útil para a métrica;
- diferença mínima que muda uma decisão;
- limite de orçamento aprovado pelo responsável;
- razão para interromper: erro, lead fora do ICP, problema ético ou falha da página.

Se não houver volume para vendas, usar a etapa mais profunda com dados suficientes e marcar conclusão como provisória.

## Qualidade de lead

### Bloqueios prévios

Desqualificar ou encaminhar para outra solução antes do score quando o lead:

- busca somente emissor de NF-e/NFS-e;
- exige funcionamento totalmente off-line;
- exige MRP/MES, contabilidade ou profundidade industrial incompatível;
- exige integração corporativa imediata que não existe.

### Score sugerido para leads sem bloqueio

- +2 produz sob pedido/lote;
- +2 tem duas ou mais etapas;
- +2 mais de uma pessoa usa;
- +1 entrada e saldo;
- +1 grade/personalização;
- +1 terceiros;
- +1 dor recente;
- −3 varejo puro.

Faixas são hipótese:

- 7+: priorizar resposta/demonstração;
- 4–6: qualificar;
- abaixo de 4: nutrir ou desqualificar.

## SLA comercial

- Definir horário público de atendimento.
- Responder rapidamente dentro desse horário; medir mediana real.
- Primeira mensagem: confirmar contexto, não despejar apresentação.
- Se não houver resposta, no máximo uma sequência curta e respeitosa.
- Permitir saída clara e registrar opt-out.
- Não adicionar contato a listas sem consentimento.

## Roteiro da demonstração

1. Repetir o problema com as palavras do lead.
2. Montar pedido semelhante, sem dados pessoais reais.
3. Mostrar etapa e responsável.
4. Mostrar uso móvel/bancada.
5. Mostrar prazo/alerta.
6. Mostrar pagamento e saldo se relevante.
7. Explicar implantação e responsabilidades.
8. Declarar limites e roadmap.
9. Perguntar o que faltou.
10. Combinar próximo passo e data.

## Ciclo de aprendizagem semanal

Toda semana registrar:

- criativos ativos e gasto;
- leads e ICP;
- perguntas frequentes;
- objeções;
- demos e comparecimento;
- motivos de perda;
- falhas de produto citadas;
- três decisões para a próxima semana.

Todo mês:

- atualizar ganchos vencedores;
- pausar mensagens sem qualidade;
- revisar ICP;
- publicar aprendizagem sem dados pessoais;
- atualizar esta memória e o CHANGELOG.

## Guardrails

- Nenhuma compra de mídia foi executada por este plano.
- Não usar lista comprada, scraping de contatos ou audiência sem base legal.
- Não atribuir resultado a anúncio sem rastreamento.
- Não usar ROAS de terceiros como meta.
- Não escalar criativo que gera lead barato e venda ruim.
- Não anunciar NF-e disponível antes da emissão real em produção.
- Não usar como destino uma página que apresente NF-e como recurso atual; corrigir e revisar `/planos` antes do lançamento.
- Não inventar depoimento, cliente, número, fila ou urgência.
