FROM node:22-alpine

# Instalar dependências globais
RUN npm install -g typescript ts-node

# Criar diretório de trabalho
WORKDIR /app

# Copiar arquivos de package.json e instalar dependências
COPY package*.json ./
RUN npm install

# Copiar o restante dos arquivos
COPY . .

# Compilar os servidores TypeScript
RUN npm run build

# Expor portas que podem ser usadas pelos servidores
EXPOSE 3000-3010

# Comando para iniciar os servidores
CMD ["npm", "start"]
