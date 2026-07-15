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
        role: 'SUPER_ADMIN',
      },
    });

    console.log(`✅ Usuário Admin criado com id: ${admin.id}`);
  } else {
    console.log('⚠️ Usuário Admin já existe. Pulando criação.');
  }

  // ─────────────────────────────────────────────────────────────────
  // 4.5 SEED DE CONFIGURAÇÕES INICIAIS (Settings)
  // ─────────────────────────────────────────────────────────────────
  console.log('⚙️ Verificando configurações padrão do sistema...');

  await prisma.setting.upsert({
    where: { key: 'LOGIN_IMAGE_URL' },
    update: {}, // Mantém o valor existente caso o usuário já tenha alterado
    create: {
      key: 'LOGIN_IMAGE_URL',
      value:
        'https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNmEwODY0OTBjZjQ0ODE5MWE0MTMxNWMxZmVkMTVkNmI6ZmlsZV8wMDAwMDAwMDk4ZGM3MWZiYmJkYjFmZmNhZDE5MzFkNSIsInRzIjoiMjA1ODkiLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6IjdjMjU3MmYyNWM0YTcxNjM4Y2FiNzkwZGZmMzk4YTlmY2Q0N2IxMGQ2OWRmYjEzZTZlYzA5ZDAxMWE0MTA2OWUiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJmbiI6bnVsbCwiY2QiOm51bGwsImNwIjpudWxsLCJtYSI6bnVsbH0=',
    },
  });

  await prisma.setting.upsert({
    where: { key: 'STORE_NAME' },
    update: {},
    create: { key: 'STORE_NAME', value: 'Dr. Pudim' },
  });

  // ─────────────────────────────────────────────────────────────────
  // 5. SEED DE DADOS DE EXEMPLO (Insumos, Produtos, Receitas)
  // ─────────────────────────────────────────────────────────────────
  const ingredientsCount = await prisma.ingredient.count();
  const productsCount = await prisma.product.count();

  if (ingredientsCount === 0 && productsCount === 0) {
    console.log(
      '📦 Criando dados de exemplo (Fornecedores, Insumos, Produtos e Receitas)...',
    );

    // 5.1 Fornecedor de Exemplo
    const supplier = await prisma.supplier.create({
      data: {
        name: 'Fornecedor Atacadista Ltda',
        cnpj: '12.345.678/0001-99',
        email: 'vendas@atacadista.com.br',
        phone: '(11) 99999-9999',
      },
    });

    // 5.2 Insumos
    const flour = await prisma.ingredient.create({
      data: {
        name: 'Leite Condensado',
        unit: 'G',
        currentStock: 395,
        averageCost: 6.5,
        minStock: 395,
      },
    });

    const sugar = await prisma.ingredient.create({
      data: {
        name: 'Açúcar Refinado',
        unit: 'G',
        currentStock: 1000,
        averageCost: 3.2,
        minStock: 1000,
      },
    });

    const eggs = await prisma.ingredient.create({
      data: {
        name: 'Ovo Branco',
        unit: 'UN',
        currentStock: 30,
        averageCost: 0.5,
        minStock: 30,
      },
    });

    const eggss = await prisma.ingredient.create({
      data: {
        name: 'Gema',
        unit: 'UN',
        currentStock: 30,
        averageCost: 0.5,
        minStock: 30,
      },
    });

    const cremeLeite = await prisma.ingredient.create({
      data: {
        name: 'Creme de Leite',
        unit: 'ML',
        currentStock: 200,
        averageCost: 3.5,
        minStock: 200,
      },
    });

    // 5.3 Produtos e Receitas
    console.log('🍔 Inserindo Produtos...');

    console.log('✅ Dados de exemplo criados com sucesso!');
  } else {
    console.log(
      '⚠️ O banco já possui insumos/produtos. Pulando a criação de dados de exemplo.',
    );
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
