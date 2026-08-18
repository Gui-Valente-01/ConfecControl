# Fontes e método

**Coleta:** 18/08/2026  
**Princípio:** priorizar fonte oficial/primária; usar páginas de fornecedores para descrever a própria oferta; marcar números autodeclarados; usar fóruns apenas como indício qualitativo.

## Método

1. Auditoria do produto no repositório local.
2. Pesquisa de dados oficiais e institucionais.
3. Leitura de concorrentes diretos, especializados e adjacentes.
4. Análise de posts e páginas públicas.
5. Inspeção pública da Biblioteca de Anúncios da Meta, Brasil, anúncios ativos.
6. Síntese separando fato, inferência, hipótese e alegação.

Não foram usados:

- grupos privados;
- perfis fechados;
- dados pessoais;
- contato com terceiros;
- compra de mídia;
- métricas inventadas;
- cópia integral de criativos.

## Convenção do catálogo

Quando uma lista aparece dentro de uma seção, cada URL herda os metadados informados na introdução daquela seção. As referências de criativos têm o registro mais detalhado em [05-biblioteca-de-criativos.csv](05-biblioteca-de-criativos.csv), com plataforma, publicação, consulta, assunto, confiança e status por URL.

## Produto ConfecControl

Fontes internas verificadas:

- [Módulos, planos e rotas](../../src/lib/features.ts)
- [Configuração fiscal e ausência de provedor real](../../src/lib/fiscal/config.ts)
- [Contrato do provedor fiscal](../../src/lib/fiscal/provider.ts)
- [Simulador/provedor falso usado em testes](../../src/lib/fiscal/provider-falso.ts)
- [Landing page](../../src/components/landing/landing-page.tsx)
- [Página de planos](../../src/app/planos/page.tsx)
- [Permissões por função](../../src/lib/capabilities.ts)
- [Regras de produção](../../src/lib/production.ts)
- [Pagamentos](../../src/lib/payments.ts)
- [Analytics de produção](../../src/lib/producao-analytics.ts)

**Limite:** presença no código não substitui teste em produção. A memória descreve recurso existente na base, mas qualquer campanha deve confirmar ambiente publicado, plano e comportamento real.

## Mercado e indústria

| Fonte | Data/publicação | Uso | Limite |
|---|---|---|---|
| [MDIC/Siscomex — características básicas](https://www.gov.br/siscomex/pt-br/servicos/aprendendo-a-exportarr-old-pasta/aprendendo-a-exportar-vestuario/caracteristicas-basicas-do-setor/caracteristicas-basicas-do-setor) | atualizado 19/11/2024 | 21.685 estabelecimentos e porte em 2022 | recorte de artigos confeccionados, não TAM |
| [MDIC/Siscomex — polos produtivos](https://www.gov.br/siscomex/pt-br/servicos/aprendendo-a-exportarr-old-pasta/aprendendo-a-exportar-vestuario/caracteristicas-basicas-do-setor/principais-polos-produtivos) | atualizado 17/12/2024 | distribuição regional | base/recorte próprios do material |
| [IBGE — PIA 2024](https://agenciadenoticias.ibge.gov.br/en/agencia-news/2184-news-agency/news/47305-industrias-de-transformacao-lideram-ocupacao-de-pessoal-em-2025) | jul/2026 | ocupação e concentração em confecção | notícia oficial sobre PIA, não universo informal |
| [IBGE — página da PIA](https://www.ibge.gov.br/estatisticas/economicas/industria/9042-pesquisa-industrial-anual.html) | consulta 18/08/2026 | metodologia e séries | exige recorte estatístico correto |
| [Abrapa — relatório setorial](https://abrapa.com.br/wp-content/uploads/2026/02/Relatorio_safra_Abrapa.fev2026.vf_.pdf) | fev/2026 | unidades, emprego, faturamento, produção/importação | compilação de bases/anos distintos |
| [IBGE — indústria em maio de 2026](https://agenciadenoticias.ibge.gov.br/agencia-sala-de-imprensa/2013-agencia-de-noticias/releases/47446-producao-industrial-varia-0-2-em-maio2) | 03/07/2026 | variação mensal de confecção | um mês não define tendência |
| [BNB/ETENE — vestuário](https://www.bnb.gov.br/revista/cse/article/view/3338) | dez/2025 | produção e projeções | projeções podem mudar |
| [SDEC Pernambuco — polo](https://www.sdec.pe.gov.br/noticias/2147-sdec-coordena-primeira-reuniao-de-grupo-de-trabalho-para-fortalecer-o-polo-de-confeccoes-de-pernambuco) | 19/06/2026 | dimensão administrativa do polo | números aguardam atualização censitária |
| [Prefeitura de Fortaleza — cadeia da moda](https://www.fortaleza.ce.gov.br/noticias/da-confeccao-ao-varejo-cadeia-da-moda-consolida-fortaleza-com-mais-de-26-mil-empresas-ativas) | 18/02/2026 | CNPJs ativos locais | recorte municipal e cadeia ampliada |
| [IBGE/Concla — CNAE](https://anda.ibge.gov.br/images/concla/downloads/cnae21_notas_explicativas.pdf) | consulta 18/08/2026 | classificação de facção, uniformes, sob medida e impressão | CNAE não comprova operação ativa |
| [IBGE/Concla — serigrafia](https://anda.ibge.gov.br/busca-online-cnae.html?subclasse=1813099&tipo=cnae&versao=10&view=subclasse) | consulta 18/08/2026 | subclasse de impressão | atividade pode ter combinações |

## Gestão, digitalização e canal

| Título/URL | Plataforma | Consulta | Assunto | Confiabilidade | Observações |
|---|---|---|---|---|---|
| [Sebrae/Sebraetec — PCP](https://polosebraeagro.sebrae.com.br/solucoes/planejamento-e-controle-de-producao/) | Sebrae | 18/08/2026 | benefícios de PCP | Alta institucional | não mede frequência no ICP |
| [Sebrae — gerenciamento da produção](https://sebrae.com.br/sites/PortalSebrae/semanadomei2019/conteudos/como-gerenciar-a-producao-na-confeccao-de-pecas%2C0e80103bc7d1b610VgnVCM1000004c00210aRCRD) | Sebrae | 18/08/2026 | sequência, tempo e qualidade | Alta institucional | orientação geral |
| [Sebrae-SP — Planejamento de Moda](https://bibliotecas.sebrae.com.br/chronus/ARQUIVOS_CHRONUS/bds/bds.nsf/9c4763c8d4bebd9e6c33c2d4a95c56a3/%24File/7310.pdf) | Sebrae/PDF | 18/08/2026 | coleção, calendário e indicadores | Alta institucional | calendário específico precisa atualização |
| [Sebrae — controle de estoque](https://meuatendimento.sebrae.com.br/sites/PortalSebrae/ufs/ba/artigos/controle-de-estoque-para-empresas-em-expansao-como-fazer-certo%2Ced9e7ff97af78910VgnVCM1000001b00320aRCRD) | Sebrae | 18/08/2026 | gargalo, compras e capital de giro | Alta institucional | não específico de confecção |
| [Agência Sebrae — WhatsApp em MPEs](https://agenciasebrae.com.br/dados/whatsapp-se-consolida-nas-vendas-on-line-enquanto-facebook-e-lojas-proprias-perdem-folego/) | Sebrae | 18/08/2026 | uso de WhatsApp | Alta institucional | micro e pequenos negócios em geral |
| [TIC Empresas 2024](https://www.cetic.br/media/docs/publicacoes/2/20250512122204/tic_empresas_2024_livro_eletronico.pdf) | Cetic.br/PDF | 18/08/2026 | canais digitais | Alta, pesquisa | empresas em geral |
| [SENAI-SP — digitalização de PMEs](https://periodicos.sp.senai.br/index.php/rcsenaisp/article/view/104) | periódico SENAI | 18/08/2026 | barreiras de adoção | Alta, revisão | não mede somente confecção |
| [SENAI — Confecção 4.0](https://www.rn.senai.br/senai-cetiqt-lanca-pos-graduacao-para-modelo-de-confeccao-4-0-no-brasil/) | SENAI | 18/08/2026 | integração física/digital | Alta institucional | notícia de formação |
| [SENAI-SC — qualidade têxtil](https://institutos.sc.senai.br/controle-de-qualidade-do-produto-textil/) | SENAI | 18/08/2026 | desperdício e produtividade | Alta institucional | conteúdo técnico geral |
| [SENAI-SC — instituto têxtil](https://institutos.sc.senai.br/textil-vestuario-design/) | SENAI | 18/08/2026 | gargalos e processos | Alta institucional | descrição de serviços |
| [Revista Produção Online — análise e redução de lead time em uma indústria de confecção](https://www.producaoonline.org.br/rpo/article/download/4790/2195) | Revista Produção Online/PDF | 18/08/2026 | atrasos, fluxo e lead time em confecção | Média-alta, estudo aplicado | estudo de caso único, com 33 colaboradores; não generalizar frequência nem resultado |
| [Sefaz-SP — estamparia](https://legislacao.fazenda.sp.gov.br/Paginas/RC29767_2024.aspx) | Sefaz-SP | 18/08/2026 | tratamento tributário | Alta oficial | consulta específica; não é aconselhamento |
| [Secretaria de Educação de Pernambuco — uniformes](https://portal.educacao.pe.gov.br/fardamento-da-rede-estadual-de-ensino-comeca-a-ser-distribuido-para-o-ano-letivo-de-2025/) | Governo de PE | 18/08/2026 | sazonalidade escolar | Alta oficial | um programa estadual, não todo o mercado |

## Linguagem pública — indício qualitativo

| Título/URL | Plataforma | Consulta | Assunto | Confiabilidade | Observações |
|---|---|---|---|---|---|
| [Quantidade de SKU ao abrir confecção](https://www.reddit.com/r/empreendedorismo/comments/1sjnex4/quero_abrir_uma_confec%C3%A7%C3%A3o/) | Reddit público | 18/08/2026 | SKU/estoque | Baixa para generalização | relato anônimo, apenas linguagem |
| [Pequena facção familiar](https://www.reddit.com/r/empreendedorismo/comments/1ufoakb/como_e_por_onde_come%C3%A7ar_a_vender_no_aacado/) | Reddit público | 18/08/2026 | operação de facção | Baixa para generalização | relato anônimo |
| [Confecção própria e caos operacional](https://www.reddit.com/r/empreendedorismo/comments/1nf08o2/desabafo/) | Reddit público | 18/08/2026 | sobrecarga | Baixa para generalização | relato anônimo |
| [Produção própria e vendas por Instagram/WhatsApp](https://www.reddit.com/r/empreendedorismo/comments/1sqyy2i/vale_a_pena_investir_r300m%C3%AAs_em_tr%C3%A1fego_pago_para/) | Reddit público | 18/08/2026 | canais de venda | Baixa para generalização | relato anônimo |
| [Produção sob medida e medo de complexidade](https://www.reddit.com/r/Engenharia/comments/1uliba0/quem_trabalha_com_produ%C3%A7%C3%A3o_sob_medida_usa_qual/) | Reddit público | 18/08/2026 | objeção a sistema | Baixa para generalização | relato anônimo |
| [Estoque descoberto tarde](https://www.reddit.com/r/empreendedorismo/comments/1to01yz/quem_aqui_s%C3%B3_descobre_os_problemas_do_estoque/) | Reddit público | 18/08/2026 | estoque | Baixa para o nicho | segmento adjacente |

**Limite:** relatos isolados, não amostra representativa. Não inferir frequência nem perfil demográfico.

## Concorrentes

**Metadados do grupo:** plataforma = sites/canais oficiais; consulta = 18/08/2026; assunto = oferta, público, recursos, preço e confiança; confiabilidade = alta para o que a página exibia e média/baixa para alegações de resultado. Preços e disponibilidade têm last_verified em 18/08/2026 e devem ser revistos trimestralmente.

### Diretos e emergentes

- [Agulhão](https://www.agulhao.com.br/)
- [Agulhão — indústria/fiscal](https://www.agulhao.com.br/industria)
- [Atentor](https://atentor.com/)
- [Sistema Moda](https://sistemamoda.com.br/)
- [Mire Data](https://www.miredata.com.br/)
- [Textil Solution](https://textilsolution.com.br/)
- [Confectus](https://www.confectus.com.br/)
- [Tramma](https://tramma360.com/)
- [Brinderoz](https://www.brinderoz.com.br/)
- [Conquest para confecções](https://conquest.com.br/erp-para-confeccoes/)
- [Conquest — preços gerais](https://conquest.com.br/preco-de-erp/)

### Especializados/corporativos

- [Sisplan](https://sisplansistemas.com.br/)
- [Sisplan — soluções](https://sisplansistemas.com.br/solucoes/)
- [Sisplan — blog](https://sisplansistemas.com.br/blog/)
- [Sisplan/Apexcon — uniformes](https://www.apexcon.com.br/sistema-para-confeccao-de-uniforme)
- [Vexta](https://www.vexta.com.br/)
- [Vexta — integrações](https://www.vexta.com.br/integracoes)
- [Vexta — case Sun Place](https://www.vexta.com.br/blog/case-de-sucesso-sun-place-jeans-transformando-desafios-em-resultados-com-vexta-erp/)
- [Systêxtil](https://systextil.com.br/)
- [Systêxtil — funcionalidades](https://systextil.com.br/funcionalidades/)
- [TOTVS Moda](https://www.totvs.com/moda/)
- [TOTVS Moda — ficha técnica](https://produtos.totvs.com/ficha-tecnica/tudo-sobre-o-totvs-moda/)
- [TOTVS Moda — fiscal](https://treinamentos.totvs.com/totvs/produto/totvs-moda-fiscal-geracao-de-documentos-fiscais-eletronicos)
- [B1 Moda](https://www.b1moda.com.br/)
- [Linx e-Millennium](https://e-millennium.com.br/)
- [Linx e-Millennium — demonstração](https://conteudo.e-millennium.com.br/demo)

### Adjacentes

- [Nomus — preços](https://www.nomus.com.br/erpindustrial/precos/)
- [Omie — indústria](https://www.omie.com.br/segmentos/sistema-erp-industria/)
- [Omie — OP por pedido](https://ajuda.omie.com.br/pt-BR/articles/3949214-cadastrando-uma-ordem-de-producao-atraves-de-um-pedido-de-venda)
- [Bling — preços](https://www.bling.com.br/planos-e-precos/login.jsp)
- [Bling — ordem de produção](https://ajuda.bling.com.br/hc/pt-br/articles/360051475753-Inserir-uma-nova-ordem-de-produ%C3%A7%C3%A3o)

**Limite:** páginas de fornecedor servem para descrever oferta e posicionamento. Clientes, resultados, anos e volumes são alegações da marca, salvo auditoria externa.

## Criativos e posts

**Metadados do grupo:** consulta = 18/08/2026. Plataforma, data de publicação, assunto, confiabilidade, reações e observações por URL estão nas linhas C011–C030 de [05-biblioteca-de-criativos.csv](05-biblioteca-de-criativos.csv).

- [Conceito Sistemas — crescimento da gestão](https://pt.linkedin.com/posts/conceito-sistemas-do-brasil_conceitosistemas-gest%C3%A3odeconfec%C3%A7%C3%A3o-erpparaconfec%C3%A7%C3%A3o-activity-7468711484315820032-5RQ1)
- [Daniela Alves — objeção de investimento](https://pt.linkedin.com/posts/daniela-alves-b457b182_agora-n%C3%A3o-%C3%A9-hora-de-investir-em-sistema-activity-7476323492184027136-5c1i)
- [Bunto — cinco sinais](https://pt.linkedin.com/posts/buntosistemas_erp-ind%C3%BAstria-pcp-activity-7432871296348155904-6HEG)
- [Rafael Honório — capacidade](https://pt.linkedin.com/posts/rafael-hon%C3%B3rio-produ%C3%A7%C3%A3o_sop-ppcp-gestaoindustrial-activity-7445430702378135552-yl0M)
- [Dr. Gestão — fluxo](https://pt.linkedin.com/posts/drgestaooficial_drgest%C3%A3o-ch%C3%A3odef%C3%A1brica-ppcp-activity-7432073354599227393-iaqR)
- [Systêxtil — celular](https://pt.linkedin.com/posts/systextil_erpcloud-gest%C3%A3ot%C3%AAxtil-ind%C3%BAstria4-activity-7364265105636630529--4NJ)
- [Consistem + Patogê — caso](https://pt.linkedin.com/posts/consistem-sistemas-ltda_sistema-erp-para-t%C3%AAxtil-e-confec%C3%A7%C3%A3o-consistem-activity-7198397679788249089-aJHH)
- [Omie — operação no WhatsApp](https://pt.linkedin.com/posts/danielrosa1_omie-whatsapp-ia-activity-7353071428679753728-_wUz)
- [Massei Uniformes — tour](https://pt.linkedin.com/posts/rafael-massei-6018a694_o-bastidor-%C3%A9-onde-a-excel%C3%AAncia-realmente-activity-7444488631169462274-oF6j)
- [Santa Marta — bastidores](https://pt.linkedin.com/posts/santamartaind_bastidores-activity-7447723461755650048-ZU12)
- [Uniformes — marketing e operação](https://pt.linkedin.com/posts/matheus-carlucci-626b85104_fevereiro-foi-um-m%C3%AAs-interessante-aqui-na-activity-7436790156445048832-lk_7)
- [Bling — treinamento de estoque](https://www.youtube.com/watch?v=BmMauvitRZI)
- [TikTok Shop — ERP](https://seller-br.tiktok.com/university/essay?knowledge_id=605713333683985)

## Biblioteca de Anúncios da Meta

Anúncios ativos observados em 18/08/2026:

- [Molde.me — ID 1422835979899945](https://www.facebook.com/ads/library/?id=1422835979899945)
- [iTAG — ID 1001170176204143](https://www.facebook.com/ads/library/?id=1001170176204143)
- [iTAG — ID 2297893920739374](https://www.facebook.com/ads/library/?id=2297893920739374)
- [Matriz — ID 1671961137344584](https://www.facebook.com/ads/library/?id=1671961137344584)
- [Matriz — ID 1655101075771566](https://www.facebook.com/ads/library/?id=1655101075771566)
- [WebPic/Dapic — ID 1977958332859256](https://www.facebook.com/ads/library/?id=1977958332859256)
- [WebPic/Dapic — ID 1391699119554709](https://www.facebook.com/ads/library/?id=1391699119554709)
- [Conceito — ID 27396372563375618](https://www.facebook.com/ads/library/?id=27396372563375618)
- [KM Sistemas — ID 1061419542891203](https://www.facebook.com/ads/library/?id=1061419542891203)
- [GUT — ID 1088779943129813](https://www.facebook.com/ads/library/?id=1088779943129813)

Consultas usadas:

- [ERP confecção — Brasil](https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=ERP%20confec%C3%A7%C3%A3o&search_type=keyword_unordered)
- [Sistema para confecção — Brasil](https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=sistema%20para%20confec%C3%A7%C3%A3o&search_type=keyword_unordered)

**Limites:**

- estado “ativo” vale para o momento da consulta;
- a biblioteca não fornece performance comercial desses anúncios;
- resultado por palavra-chave inclui falsos positivos;
- ausência em uma busca não prova ausência de mídia;
- peças e textos podem mudar ou deixar de existir.

## Práticas de mídia — fontes oficiais Meta

**Metadados do grupo:** plataforma = Meta for Business/Help; consulta = 18/08/2026; assunto = leads, mensagens, formulários, público, Reels, mensuração e transparência; confiabilidade = alta para funcionamento descrito pela plataforma; observação = algumas páginas exigiram sessão ou aplicaram limitação temporária.

- [Anúncios que levam a mensagem](https://www.facebook.com/business/ads/click-to-message-ads)
- [Leads com mensagens](https://www.facebook.com/business/ads/ad-objectives/lead-generation/lead-ads-with-messaging)
- [Formulários de lead](https://www.facebook.com/business/ads/ad-objectives/lead-generation/lead-ads-with-forms)
- [Advantage+ Leads](https://www.facebook.com/business/ads/meta-advantage-plus/leads)
- [Advantage+ Audience](https://www.facebook.com/business/ads/meta-advantage-plus/audience)
- [Reels Ads](https://www.facebook.com/business/ads/facebook-instagram-reels-ads)
- [Conversions API](https://www.facebook.com/business/help/AboutConversionsAPI)
- [Sobre a Biblioteca de Anúncios](https://www.facebook.com/help/259468828226154)

Algumas páginas podem exigir sessão ou aplicar limitação temporária. A estratégia deve ser revalidada dentro do Gerenciador de Anúncios antes de configuração.

## Critério para novas fontes

Adicionar somente se:

- houver URL ou documento identificável;
- a data estiver registrada;
- estiver claro quem publicou;
- alegações comerciais forem marcadas;
- a conclusão não extrapolar o recorte;
- informação pessoal for removida;
- a atualização entrar no CHANGELOG.
