import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando o seed do banco de dados...');

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@exemplo.com';
  const adminUsername = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error(
      '❌ SEED_ADMIN_PASSWORD não definida. ' +
      'Defina a variável de ambiente antes de rodar o seed.',
    );
    process.exit(1);
  }

  // 2. Verifica se já existe para não dar erro de duplicidade
  const userExists = await prisma.user.findFirst({
    where: {
      OR: [{ email: adminEmail }, { username: adminUsername }],
    },
  });

  if (!userExists) {
    // 3. Criptografa a senha (nunca salve texto puro!)
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // 4. Cria o usuário
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        username: adminUsername,
        name: 'Administrador do Sistema',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    console.log(`✅ Usuário Admin criado com id: ${admin.id}`);
  } else {
    console.log('⚠️ Usuário Admin já existe. Pulando criação.');
  }
}

// Tratamento de erros e desconexão
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
