# Nola Analytics - Plataforma de Análise de Dados para Restaurantes

## 📊 Visão Geral do Projeto

O Nola Analytics é uma plataforma full-stack desenvolvida para fornecer análises de dados e métricas de desempenho para o setor de restaurantes. O projeto é dividido em duas partes principais: um **Backend** robusto construído com FastAPI (Python) para servir a API de dados e um **Frontend** dinâmico desenvolvido com React (JavaScript) para visualização e interação.

## 🛠️ Tecnologias Utilizadas

| Componente | Tecnologia Principal | Frameworks/Bibliotecas Chave |
| :--- | :--- | :--- |
| **Backend (API)** | Python | FastAPI, `psycopg2` (PostgreSQL driver) |
| **Frontend (Web)** | JavaScript | React, Vite, Axios, Recharts |
| **Banco de Dados** | PostgreSQL | SQL |
| **Infraestrutura** | Docker | Docker Compose |

## 🚀 Como Rodar o Projeto (Recomendado: Docker)

A maneira mais simples e recomendada de iniciar o projeto é utilizando o Docker Compose, que configura automaticamente o banco de dados, o backend e o frontend.

### Pré-requisitos

Certifique-se de ter o **Docker** e o **Docker Compose** instalados em sua máquina.

### Passos de Instalação

1.  **Clone o Repositório:**
    ```bash
    git clone https://github.com/Rinosifterino/ProjetoNOLA.git
    cd ProjetoNOLA
    ```

2.  **Configurar e Iniciar os Serviços:**
    Execute o comando abaixo na raiz do projeto (onde está o `docker-compose.yml`):
    ```bash
    docker-compose up --build -d
    ```
    Este comando irá:
    *   Construir as imagens Docker para o Backend e o Frontend.
    *   Iniciar o serviço de banco de dados PostgreSQL.
    *   Executar o script `database-schema.sql` para criar as tabelas no banco de dados.
    *   Iniciar o Backend (API) e o Frontend (Web).

3.  **Acessar a Aplicação:**
    *   **Frontend (Aplicação Web):** Acesse `http://localhost:5173`
    *   **Backend (API Docs ):** Acesse `http://localhost:8000/docs`

---

## 💻 Como Rodar Localmente (Desenvolvimento )

Se você preferir rodar o Frontend e o Backend separadamente para desenvolvimento, siga os passos abaixo.

### 1. Configuração do Banco de Dados

Você precisará de uma instância do PostgreSQL rodando. A forma mais fácil é usar o serviço de banco de dados do Docker Compose:

1.  Inicie apenas o serviço de banco de dados:
    ```bash
    docker-compose up -d postgres
    ```
2.  Execute o script SQL para criar o esquema (assumindo que você tem o `psql` instalado ou está usando um cliente):
    ```bash
    # Exemplo de conexão com o container do DB
    docker exec -i nola_db psql -U postgres -d nola_db < database-schema.sql
    ```
    > **Nota:** As credenciais do banco de dados estão definidas no `docker-compose.yml`.

### 2. Configuração do Backend (Python/FastAPI)

1.  Navegue até o diretório do backend:
    ```bash
    cd backend
    ```
2.  Crie e ative um ambiente virtual (recomendado):
    ```bash
    python -m venv venv
    source venv/bin/activate  # Linux/macOS
    # ou
    /venv/Scripts/activate   # Windows
    ```
3.  Instale as dependências:
    ```bash
    pip install -r requirements.txt
    ```
    > **Nota:** O arquivo `requirements.txt` deve ser criado no diretório `backend/` com as dependências do seu projeto.

4.  Inicie o servidor da API:
    ```bash
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
    ```
    A API estará disponível em `http://localhost:8000`.

### 3. Configuração do Frontend (React/Vite )

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
