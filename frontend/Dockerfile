# Etapa 1: Build
FROM node:22-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Cria a pasta 'dist' otimizada para produção
RUN npm run build

# Etapa 2: Servidor Web (Nginx)
FROM nginx:alpine

# Copia os arquivos gerados na etapa anterior para o Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copia nossa configuração customizada do Nginx (vamos criar abaixo)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]