import psycopg2
from psycopg2 import pool

DB_HOST = "localhost" 
DB_PORT = "5432"
DB_NAME = "challenge_db"
DB_USER = "challenge"
DB_PASS = "challenge_2024"

try:
    postgreSQL_pool = pool.SimpleConnectionPool(1, 20,
        user=DB_USER,
        password=DB_PASS,
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME)

    print("Conexão ao PostgreSQL Pool estabelecida com sucesso.")

except (Exception, psycopg2.Error) as error:
    print("Erro ao conectar ao PostgreSQL:", error)

    raise error

def get_db_connection():
    """Obtém uma conexão do pool para ser usada em um endpoint."""
    conn = None
    try:
        conn = postgreSQL_pool.getconn()
        return conn
    except (Exception, psycopg2.Error) as error:
        print("Erro ao obter conexão do pool:", error)
        raise error

def release_db_connection(conn):
    """Retorna a conexão para o pool."""
    if conn:
        postgreSQL_pool.putconn(conn)
