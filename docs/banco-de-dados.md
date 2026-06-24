# Banco de dados do ConfecControl

O projeto esta preparado para usar MySQL local com Prisma.

## Jeito mais facil

Rode:

```bash
npm run db:setup
```

O instalador vai pedir:

- Usuario do MySQL, normalmente `root`
- Senha do MySQL

Ele cria o banco `confeccontrol`, salva `.env.local`, gera o Prisma Client e cria as tabelas.

## Conexao manual

Se preferir fazer manualmente, crie `.env.local` com:

```env
DATABASE_URL="mysql://root:SUA_SENHA@localhost:3306/confeccontrol"
```

## Comandos que serao usados

Depois de configurar `.env.local`:

```bash
npm run db:generate
npm run db:push
```

O comando `db:push` cria as tabelas no MySQL com base no arquivo:

```text
prisma/schema.prisma
```

## Estrutura criada

- empresas
- usuarios
- clientes
- produtos
- pedidos
- pedido_itens
- etapas_producao
- historico_status
- materiais
- movimentos_estoque
- pagamentos
- anexos
