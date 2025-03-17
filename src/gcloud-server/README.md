# Google Cloud MCP Server

Um servidor MCP (Model Context Protocol) que fornece acesso aos serviços do Google Cloud Platform (GCP).

## Configuração

### Pré-requisitos

1. Node.js v20 ou superior
2. Uma conta Google Cloud com os seguintes serviços habilitados:
   - Cloud Storage
   - Compute Engine
   - BigQuery
   - Cloud Vision API
3. Um arquivo de credenciais do Google Cloud (JSON key file)

### Variáveis de Ambiente

- `GOOGLE_APPLICATION_CREDENTIALS`: Caminho para o arquivo de credenciais do Google Cloud
- `GOOGLE_CLOUD_PROJECT`: ID do projeto Google Cloud

### Instalação

```bash
# Instalar dependências
npm install

# Compilar TypeScript
npm run build
```

## Ferramentas Disponíveis

### Storage

#### storage_list_files
Lista arquivos em um bucket do Cloud Storage.
```typescript
{
  bucket: string;      // Nome do bucket
  prefix?: string;     // Prefixo opcional para filtrar arquivos
}
```

#### storage_upload_file
Faz upload de um arquivo para o Cloud Storage.
```typescript
{
  bucket: string;      // Nome do bucket
  destination: string; // Caminho de destino no bucket
  content: string;     // Conteúdo do arquivo
}
```

### Compute Engine

#### compute_list_instances
Lista instâncias do Compute Engine em uma zona.
```typescript
{
  zone: string;        // Nome da zona (ex: us-central1-a)
}
```

#### compute_start_instance
Inicia uma instância do Compute Engine.
```typescript
{
  zone: string;        // Nome da zona
  instance: string;    // Nome da instância
}
```

#### compute_stop_instance
Para uma instância do Compute Engine.
```typescript
{
  zone: string;        // Nome da zona
  instance: string;    // Nome da instância
}
```

### BigQuery

#### bigquery_query
Executa uma consulta SQL no BigQuery.
```typescript
{
  query: string;       // Consulta SQL
  maxResults?: number; // Número máximo de resultados
}
```

### Vision API

#### vision_analyze_image
Analisa uma imagem usando o Cloud Vision API.
```typescript
{
  imageUrl: string;    // URL da imagem
  features: string[];  // Lista de features para detectar
}
```

Features disponíveis:
- LABEL_DETECTION
- TEXT_DETECTION
- FACE_DETECTION
- LANDMARK_DETECTION
- LOGO_DETECTION
- OBJECT_LOCALIZATION

## Exemplos de Uso

### Listando arquivos em um bucket

```typescript
const result = await mcp.callTool("gcloud", "storage_list_files", {
  bucket: "meu-bucket",
  prefix: "pasta/"
});
```

### Iniciando uma instância

```typescript
const result = await mcp.callTool("gcloud", "compute_start_instance", {
  zone: "us-central1-a",
  instance: "minha-instancia"
});
```

### Executando uma consulta BigQuery

```typescript
const result = await mcp.callTool("gcloud", "bigquery_query", {
  query: "SELECT * FROM `projeto.dataset.tabela` LIMIT 10"
});
```

### Analisando uma imagem

```typescript
const result = await mcp.callTool("gcloud", "vision_analyze_image", {
  imageUrl: "https://exemplo.com/imagem.jpg",
  features: ["LABEL_DETECTION", "TEXT_DETECTION"]
});
```

## Segurança

- Todas as credenciais são gerenciadas através do arquivo de credenciais do Google Cloud
- O acesso aos serviços é controlado pelas IAM roles atribuídas à service account
- As operações são registradas no Cloud Audit Logs para auditoria
