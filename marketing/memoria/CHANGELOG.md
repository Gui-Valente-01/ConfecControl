# Changelog da memória de marketing

## 2026-08-18 — versão 1.3

### Achado crítico, corrigido

A auditoria das páginas públicas encontrou `/planos` vendendo “Nota fiscal
(NF-e) — emissão e acompanhamento a partir do pedido, com XML e DANFE”. O
recurso não existe: o provedor configurado é o falso e não há integração com a
SEFAZ. A página estava no ar assim.

- **Causa:** ninguém escreveu esse anúncio. O módulo fiscal foi acrescentado à
  lista de recursos vendáveis e a vitrine lia a lista inteira; o plano
  “Completo” usava todas as chaves. Um módulo interno virou promessa comercial
  sozinho.
- **Correção:** recurso passa a declarar se é anunciável; `/planos` e as páginas
  por segmento leem só os anunciáveis; nenhum preset concede módulo não
  anunciável. Teste de regressão em `tests/features-vitrine.test.ts`, incluindo
  verificação de que as vitrines não voltem a importar a lista completa.
- **Efeito na memória:** o bloqueio de mídia sobre `/planos` foi levantado.

### Lição registrada

A regra “não anunciar NF-e” não bastou, porque a promessa não passou por texto —
passou por configuração. Antes de campanha, conferir a página renderizada, e não
só o que se pretendeu escrever.

## 2026-08-18 — versão 1.3

### Auditoria do site público

- página inicial e página de planos verificadas no ambiente ao vivo;
- registrado o conflito crítico de `/planos`: NF-e aparece como disponível no plano Completo, embora o produto só possua provedor falso e nenhuma integração real com a SEFAZ;
- campanha e destino `/planos` bloqueados até a correção da comunicação fiscal;
- promessas de “no ar em uma tarde”, aprendizado por familiaridade com WhatsApp e cadastro em menos de dois minutos classificadas como hipóteses até medição operacional;
- referências públicas e limites adicionados ao catálogo de fontes.

### Correções de consistência

- removida a recomendação não comprovada de “implantação curta” da análise competitiva;
- arquivos de hipóteses/testes e calendário passaram a explicitar a pré-condição fiscal para mídia.

## 2026-08-18 — versão 1.2

### Auditoria de conformidade

Conferência da base contra as regras de pesquisa, sem reescrever conteúdo anterior.

- entregáveis mínimos verificados por contagem: 30 ganchos, 10 conceitos de anúncio, 5 Reels, 3 carrosséis, 20 ideias, 30 registros no CSV com as 37 colunas previstas e as oito notas de 0 a 10;
- 94 endereços em 49 domínios distintos no catálogo de fontes;
- nenhum dado pessoal encontrado: os números do arquivo de concorrentes são identificadores públicos de anúncio da Meta, não contatos;
- jargão vetado aparece somente onde a própria base manda evitá-lo;
- NF-e permanece descrita como indisponível e em desenvolvimento em todas as ocorrências.

### Mudança no produto

- o módulo fiscal foi liberado para a empresa de teste, em produção, e incluído no seed;
- **isto não altera a verdade do produto:** o provedor continua sendo o falso, sem integração com SEFAZ. A tela avisa “Ambiente de teste (homologação)” e informa que as respostas são simuladas;
- **risco de comunicação:** a conta de teste é a usada em demonstrações, e agora exibe o menu fiscal. Em demonstração, não apresentar a NF-e como recurso atual; se o interessado perguntar, dizer que está em desenvolvimento, conforme a regra já registrada em [03-dores-desejos-e-objecoes.md](03-dores-desejos-e-objecoes.md).

## 2026-08-18 — versão 1.1

### Arquivos atualizados

- INDEX;
- mercado, ICP e dores;
- concorrentes;
- biblioteca de criativos;
- ganchos/copies;
- ideias de conteúdo;
- hipóteses/testes;
- calendário;
- fontes.

### Correções e melhorias

- corrigido o indicador de 9,5% da PIA: refere-se ao VTI das oito maiores, não ao pessoal ocupado;
- explicitado o recorte formal da PIA;
- rebaixada a prioridade geográfica para hipótese de confiança média;
- ICPs e frequências de dores identificados como hipóteses/inferências até entrevistas próprias;
- falas públicas transformadas em paráfrases, sem aspas;
- NF-e descrita como desenvolvimento indisponível com provedor falso, sem integração real/SEFAZ;
- preços de Bling, Nomus, Brinderoz e Conquest atualizados e condicionados;
- CSV ampliado para 37 colunas, 30 URLs únicas, last_verified, status, publicação, análise e oito notas;
- 20 ideias e 18 conceitos/roteiros receberam avaliação de 0 a 10;
- hipóteses ganharam evidência, público, variável, esforço, impacto, resultado e aprendizado;
- calendário ganhou canais, proporções, ativos, UTM e status;
- adicionada a fonte primária do estudo aplicado de lead time, com limite explícito de caso único;
- promessa de implantação em uma tarde bloqueada até existir medição real;
- gancho próximo a referência foi reescrito.

## 2026-08-18 — versão 1.0

### Adicionado

- auditoria da verdade atual do produto;
- síntese do mercado brasileiro e limites de TAM/SAM;
- quatro recortes de ICP e anti-ICP;
- mapa de dores, desejos, objeções e linguagem pública;
- matriz de 18 concorrentes;
- análise de NF-e como paridade e regra de comunicação enquanto o recurso está em desenvolvimento;
- biblioteca com 30 referências públicas, incluindo 10 anúncios ativos observados na Meta;
- 30 ganchos;
- 10 conceitos de anúncio;
- 5 roteiros de Reels;
- 3 carrosséis;
- 20 ideias de conteúdo;
- plano de funil, mensuração e 12 hipóteses;
- calendário editorial de quatro semanas;
- catálogo de fontes e protocolo de atualização.

### Decisões

- foco recomendado em empresas que produzem por pedido;
- prioridade para uniformes, estamparias e confecção sob encomenda;
- facções mantidas como segmento de descoberta até validar rotinas essenciais;
- posicionamento centrado em produzir, entregar e cobrar;
- “ERP completo” e “gestão 360°” removidos como mensagens principais;
- NF-e proibida como recurso disponível enquanto não houver provedor real, integração validada e lançamento.

### Pendências

- entrevistas com clientes e leads;
- cálculo de TAM/SAM por CNAE;
- preço e oferta comercial final;
- caso de cliente autorizado;
- linha de base de conversão;
- validação de fluxo específico de facção;
- demanda real por NF-e versus NFS-e.
