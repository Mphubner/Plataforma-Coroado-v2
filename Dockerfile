# Estágio 1: Build da aplicação React/Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar apenas o package.json primeiro para evitar bugs de plataforma do lockfile
COPY package.json ./
RUN npm install

# Copiar todo o código-fonte e compilar
COPY . .
RUN npm run build

# Estágio 2: Servir a aplicação com Nginx
FROM nginx:alpine

# Copiar os arquivos gerados no estágio 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar nossa configuração customizada do Nginx para escutar na porta 8080 e gerenciar rotas do React
COPY nginx.conf /etc/nginx/conf.d/default.conf

# A porta que o Cloud Run usa por padrão
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
