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
        'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=1200&q=80',
    },
  });

  await prisma.setting.upsert({
    where: { key: 'STORE_NAME' },
    update: {},
    create: { key: 'STORE_NAME', value: 'StockFlow' },
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
        name: 'Farinha de Trigo',
        unit: 'KG',
        currentStock: 50,
        averageCost: 4.5,
        minStock: 15,
      },
    });

    const sugar = await prisma.ingredient.create({
      data: {
        name: 'Açúcar Refinado',
        unit: 'KG',
        currentStock: 30,
        averageCost: 3.2,
        minStock: 10,
      },
    });

    const eggs = await prisma.ingredient.create({
      data: {
        name: 'Ovos Brancos',
        unit: 'UNIT',
        currentStock: 120,
        averageCost: 0.5,
        minStock: 30,
      },
    });

    // 5.3 Produtos e Receitas
    console.log('🍔 Inserindo Produtos...');

    // Produto Manufaturado (Com Receita)
    await prisma.product.create({
      data: {
        name: 'Bolo Caseiro Simples',
        category: 'Padaria',
        internalCode: 'PROD-001',
        barcode: '7890000000001',
        unit: 'UNIT',
        costPrice: 3.49, // (0.3 * 4.5) + (0.2 * 3.2) + (3 * 0.5)
        salePrice: 15.0,
        currentStock: 5,
        minStock: 2,
        isManufactured: true,
        recipeItems: {
          create: [
            { ingredientId: flour.id, quantity: 0.3 }, // 300g de farinha
            { ingredientId: sugar.id, quantity: 0.2 }, // 200g de açúcar
            { ingredientId: eggs.id, quantity: 3 }, // 3 unidades de ovo
          ],
        },
      },
    });

    // Produto de Revenda Direta
    await prisma.product.create({
      data: {
        name: 'Refrigerante Cola 2L',
        category: 'Bebidas',
        internalCode: 'PROD-002',
        barcode: '7890000000002',
        unit: 'UNIT',
        costPrice: 5.5,
        salePrice: 10.0,
        currentStock: 40,
        minStock: 12,
        isManufactured: false,
      },
    });

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
