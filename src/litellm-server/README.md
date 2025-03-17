# LiteLLM MCP Server

Um servidor MCP (Model Context Protocol) que atua como interface para o LiteLLM proxy, permitindo gerenciar chaves virtuais e fazer chamadas para modelos de linguagem de forma centralizada.

## Configuração

### Pré-requisitos

1. Node.js v20 ou superior
2. Um servidor LiteLLM proxy em execução
3. Uma chave mestra do LiteLLM (LITELLM_MASTER_KEY)

### Variáveis de Ambiente

- `LITELLM_HOST`: URL do servidor LiteLLM proxy (padrão: http://localhost:4000)
- `LITELLM_MASTER_KEY`: Chave mestra para autenticação com o servidor LiteLLM

### Instalação

```bash
# Instalar dependências
npm install

# Compilar TypeScript
npm run build
```

## Ferramentas Disponíveis

### generate_key

Gera uma nova chave virtual para o proxy LiteLLM.

```typescript
{
  models: string[];      // Lista de modelos permitidos
  user_id: string;      // Identificador do usuário
  team_id?: string;     // Identificador da equipe (opcional)
  duration?: string;    // Duração da chave (ex: "24h", "7d")
}
```

### get_key_info

Obtém informações sobre uma chave virtual.

```typescript
{
  key: string;          // Chave virtual para consultar
}
```

### list_models

Lista todos os modelos disponíveis no proxy LiteLLM.

### proxy_completion

Faz uma requisição de completion através do proxy LiteLLM.

```typescript
{
  model: string;        // Modelo a ser usado
  messages: Array<{     // Mensagens para o chat
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  key: string;          // Chave virtual para autenticação
}
```

## Exemplos de Uso

### Gerando uma Nova Chave

```typescript
const result = await mcp.callTool("litellm", "generate_key", {
  models: ["gpt-3.5-turbo"],
  user_id: "dev1@company.com",
  team_id: "engineering",
  duration: "30d"
});
```

### Consultando Informações da Chave

```typescript
const result = await mcp.callTool("litellm", "get_key_info", {
  key: "sk-abc123..."
});
```

### Fazendo uma Requisição de Completion

```typescript
const result = await mcp.callTool("litellm", "proxy_completion", {
  model: "gpt-3.5-turbo",
  messages: [
    { role: "user", content: "Qual é a capital do Brasil?" }
  ],
  key: "sk-abc123..."
});
```

## Segurança

- As chaves virtuais são gerenciadas de forma segura pelo proxy LiteLLM
- O acesso aos modelos pode ser restrito por chave
- O uso é rastreado e pode ser limitado por usuário/equipe
- A chave mestra nunca é exposta aos usuários finais
