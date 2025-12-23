import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function resetDatabase() {
  // Ordem importa: apagar primeiro quem tem chave estrangeira (se houvesse)
  // Como só temos 'user', é simples.
  // Usamos deleteMany para apagar os dados sem apagar a tabela.
  await prisma.user.deleteMany();
}
