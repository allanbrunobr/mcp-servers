# MCP Servers

Este repositório contém uma coleção de servidores MCP (Model Context Protocol) que podem ser usados para estender as capacidades de modelos de linguagem como o Claude.

## O que é MCP?

O Model Context Protocol (MCP) é um protocolo que permite a comunicação entre modelos de linguagem e servidores locais, fornecendo ferramentas e recursos adicionais para estender as capacidades dos modelos.

## Servidores Disponíveis

Este repositório inclui vários servidores MCP, incluindo:

- **filesystem**: Acesso ao sistema de arquivos local
- **flowise**: Integração com Flowise para fluxos de trabalho
- **gcloud**: Integração com serviços do Google Cloud
- **github**: Integração com GitHub
- **mysql**: Integração com bancos de dados MySQL
- **postgresql**: Integração com bancos de dados PostgreSQL
- **stripe**: Integração com a API do Stripe
- **supabase**: Integração com Supabase
- **litellm**: Proxy para vários modelos de linguagem
- **sonarqube**: Integração com SonarQube para análise de código
- **Serper-search-mcp**: Integração com a API Serper para pesquisas na web
- **firecrawl-mcp-server**: Ferramenta para web scraping
- **wolframalpha-llm-mcp**: Integração com WolframAlpha

## Como Usar

Para usar estes servidores MCP, você precisa:

1. Clonar este repositório
2. Configurar as variáveis de ambiente necessárias para cada servidor
3. Adicionar os servidores à configuração do seu cliente MCP

### Usando com Docker

Este repositório inclui um Dockerfile e um arquivo docker-compose.yml para facilitar a execução dos servidores MCP em contêineres Docker.

Para executar os servidores usando Docker:

```bash
# Construir e iniciar os contêineres
docker-compose up -d

# Verificar os logs
docker-compose logs -f

# Parar os contêineres
docker-compose down
```

Antes de executar, certifique-se de configurar as variáveis de ambiente necessárias no arquivo `docker-compose.yml`.

## Configuração

Cada servidor MCP pode ter requisitos específicos de configuração. Consulte a documentação em cada pasta de servidor para obter instruções detalhadas.

## Contribuição

Contribuições são bem-vindas! Se você deseja adicionar um novo servidor MCP ou melhorar um existente, sinta-se à vontade para abrir um pull request.

## Licença

Este projeto está licenciado sob a licença MIT.
