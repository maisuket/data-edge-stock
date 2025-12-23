# Usa uma imagem leve do Node
FROM node:22-alpine

# Cria a pasta de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./
COPY prisma ./prisma/

# Instala as dependências
RUN npm ci

# Copia o restante do código fonte
COPY . .

# Gera o cliente do Prisma (necessário para o ORM funcionar)
RUN npx prisma generate

# Compila o projeto NestJS
RUN npm run build

# Expõe a porta 3000
EXPOSE 3000

# Comando para iniciar em produção
CMD ["npm", "run", "start:prod"]