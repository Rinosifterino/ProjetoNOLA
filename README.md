# Restaurante Analytics - Plataforma de Análise de Dados para Restaurantes

## 📊 Visão Geral do Projeto

O Restaurante Analytics é uma plataforma full-stack desenvolvida para fornecer análises de dados e métricas de desempenho para o setor de restaurantes. O projeto é dividido em duas partes principais: um **Backend** robusto construído com FastAPI (Python) para servir a API de dados e um **Frontend** dinâmico desenvolvido com React (JavaScript) para visualização e interação.

## 🛠️ Tecnologias Utilizadas

| Componente | Tecnologia Principal | Frameworks/Bibliotecas Chave |
| :--- | :--- | :--- |
| **Backend (API)** | Python | FastAPI, `psycopg2` (PostgreSQL driver) |
| **Frontend (Web)** | JavaScript | React, Vite, Axios, Recharts |
| **Banco de Dados** | PostgreSQL | SQL |
| **Infraestrutura** | Docker | Docker Compose |

## 🚀 Quick Start - 5 Minutos (Recomendado: Docker)

A maneira mais rápida e recomendada de iniciar o projeto é utilizando o Docker Compose, que configura automaticamente o banco de dados, o gerador de dados e o pgAdmin.

### Pré-requisitos

Certifique-se de ter o **Docker** e o **Docker Compose** instalados em sua máquina.

### 1. Clone o Repositório

```bash
git clone https://github.com/Rinosifterino/ProjetoNOLA.git
cd ProjetoNOLA
```

### 2. Setup Completo e Geração de Dados

Execute a sequência de comandos abaixo para iniciar os serviços, gerar 500.000 vendas e iniciar o pgAdmin.

#### Para Linux/macOS (Bash)

```bash
# Desliga containers antigos e remove volumes (se existirem)
docker compose down -v 2>/dev/null || true

# Constrói a imagem do gerador de dados
docker compose build --no-cache data-generator

# Inicia o banco de dados em background
docker compose up -d postgres

# Roda o gerador de dados e remove o container após a execução
docker compose run --rm data-generator

# Inicia o pgAdmin (perfil tools)
docker compose --profile tools up -d pgadmin
```

#### Para Windows (PowerShell)

```powershell
# Desliga containers antigos e remove volumes (o bloco try/catch evita o erro se o container não existir)
try { docker compose down -v } catch { Write-Host "Containers não estavam rodando, continuando..." }

# Constrói a imagem do gerador de dados
docker compose build --no-cache data-generator

# Inicia o banco de dados em background
docker compose up -d postgres

# Roda o gerador de dados e remove o container após a execução
docker compose run --rm data-generator

# Inicia o pgAdmin (perfil tools)
docker compose --profile tools up -d pgadmin
```

**Aguarde 5-15 minutos** enquanto 500k vendas são geradas pelo `data-generator`.

### 3. Verifique a Geração de Dados

Execute o comando abaixo para confirmar que os dados foram gerados:

```bash
docker compose exec postgres psql -U challenge challenge_db -c 'SELECT COUNT(*) FROM sales;'
# Deve mostrar ~500k
```

### 4. Acessar Serviços

*   **Frontend (Aplicação Web):** Acesse `http://localhost:5173`
*   **Backend (API Docs):** Acesse `http://localhost:8000/docs`

---

## 💻 Como Rodar Localmente

### 1. Configuração do Banco de Dados

1.  Inicie o serviço de banco de dados:
    ```bash
    docker-compose up -d postgres
    ```
2.  Execute o script SQL para criar o esquema:
    
    **Para Linux/macOS ou Prompt de Comando (CMD) do Windows:**
    ```bash
    docker exec -i godlevel-db psql -U challenge -d challenge_db < database-schema.sql
    ```
    
    **Para PowerShell do Windows:**
    ```powershell
    type database-schema.sql | docker exec -i godlevel-db psql -U challenge -d challenge_db
    ```
    
    > **Nota:** O nome do container é `godlevel-db` e as credenciais são: Usuário: `challenge`, Senha: `challenge_2024`, Banco: `challenge_db`.

### 2. Configuração do Backend (Python/FastAPI)

1.  Navegue até o diretório do backend:
    ```bash
    cd backend
    ```
2.  Crie e ative um ambiente virtual:
    ```bash
    python -m venv venv
    source venv/bin/activate  # Linux/macOS
    # ou
    # venv\Scripts\activate   # Windows
    ```
3.  Instale as dependências:
    ```bash
    pip install -r requirements.txt
    ```
    > **Nota:** O arquivo `requirements.txt` deve estar no diretório `backend/` com as dependências do seu projeto.

4.  Inicie o servidor da API:
    ```bash
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
    ```
    A API estará disponível em `http://localhost:8000`.

### 3. Configuração do Frontend (React/Vite)

1.  Navegue até o diretório do frontend:
    ```bash
    cd ../frontend
    ```
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```
    O Frontend estará disponível em `http://localhost:5173`.
