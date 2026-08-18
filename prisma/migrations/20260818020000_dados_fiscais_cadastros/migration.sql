-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "codigoMunicipio" TEXT,
ADD COLUMN     "complemento" TEXT,
ADD COLUMN     "inscricaoEstadual" TEXT,
ADD COLUMN     "logradouro" TEXT,
ADD COLUMN     "municipio" TEXT,
ADD COLUMN     "nomeFantasia" TEXT,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "razaoSocial" TEXT,
ADD COLUMN     "regimeTributario" TEXT,
ADD COLUMN     "uf" TEXT;

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "codigoMunicipio" TEXT,
ADD COLUMN     "complemento" TEXT,
ADD COLUMN     "indicadorIe" TEXT,
ADD COLUMN     "inscricaoEstadual" TEXT,
ADD COLUMN     "logradouro" TEXT,
ADD COLUMN     "municipio" TEXT,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "uf" TEXT;

-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "cest" TEXT,
ADD COLUMN     "cfopSugerido" TEXT,
ADD COLUMN     "ncm" TEXT,
ADD COLUMN     "origem" TEXT,
ADD COLUMN     "unidadeComercial" TEXT;
