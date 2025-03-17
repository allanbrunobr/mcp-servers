#!/bin/bash

# Script para iniciar os servidores MCP

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "Node.js não está instalado. Por favor, instale o Node.js para continuar."
    exit 1
fi

# Verificar se o TypeScript está instalado
if ! command -v tsc &> /dev/null; then
    echo "TypeScript não está instalado. Instalando..."
    npm install -g typescript
fi

# Instalar dependências
echo "Instalando dependências..."
npm install

# Compilar os servidores TypeScript
echo "Compilando servidores..."
npm run build

# Iniciar os servidores
echo "Iniciando servidores MCP..."
npm start

echo "Servidores MCP iniciados com sucesso!"
