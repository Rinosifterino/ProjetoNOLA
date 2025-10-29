from fastapi import FastAPI, Depends, HTTPException
from database import get_db_connection, release_db_connection
from psycopg2.extras import RealDictCursor
from psycopg2 import sql
from typing import Any
from querybuilder import QueryBuilder  # <--- NOVO IMPORT
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from fastapi.middleware.cors import CORSMiddleware
import psycopg2

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],  
)

class GroupByItem(BaseModel):
    column: str
    granularity: Optional[str] = None 

class QueryRequest(BaseModel):
    metric: Dict[str, str]
    group_by: List[GroupByItem] = []
    filters: List[Dict[str, Any]] = []
    order_by: Optional[str] = "metric_result DESC"
    limit: int = 100

def get_db():
    conn = None
    try:
        conn = get_db_connection()
        yield conn
    finally:
        release_db_connection(conn)

@app.get("/")
def read_root():
    return {"message": "API de Analytics para Restaurantes Rodando!"}

@app.get("/api/v1/metrics/vendas_e_lojas")
def get_sales_and_stores_count(conn: Any = Depends(get_db)):
    """Endpoint para retornar a contagem de vendas e lojas."""
    try:
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM sales;")
        sales_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM stores;")
        stores_count = cursor.fetchone()[0]
        
        return {
            "sales_count": sales_count,
            "stores_count": stores_count,
            "status": "ok"
        }
        
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro no Banco de Dados: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro Interno: {str(e)}")


@app.get("/api/v1/analytics/tabelas")
def get_all_tables_count(conn: Any = Depends(get_db)):
    """Retorna a contagem de registros de todas as tabelas do banco de dados."""
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE';
        """)
        tables = [row['table_name'] for row in cursor.fetchall()]
        
        counts = {}
        
        for table in tables:
            query = sql.SQL("SELECT COUNT(*) FROM {table}").format(table=sql.Identifier(table))
            
            cursor.execute(query)
            count = cursor.fetchone()['count']
            counts[table] = count
            
        return counts
        
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro no Banco de Dados: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro Interno: {str(e)}")
    
@app.get("/api/v1/analytics/vendas")
def get_monthly_sales(conn: Any = Depends(get_db)):
    """
    Retorna o total de vendas (total_amount) agrupado por mês e ano.
    Ideal para gráficos de série temporal.
    """
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        sql_query = """
            SELECT
                DATE_TRUNC('month', created_at) AS month_year,
                SUM(people_quantity) AS valores
            FROM sales
            GROUP BY month_year
            ORDER BY month_year;
        """
        
        cursor.execute(sql_query)
        results = cursor.fetchall()
        
        return {"data": results, "status": "ok"}
        
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro no Banco de Dados: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro Interno: {str(e)}")

@app.post("/api/v1/analytics/query")
def run_flexible_query(request: QueryRequest, conn: Any = Depends(get_db)):
    """Endpoint flexível para construir e executar queries de agregação."""
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        builder = QueryBuilder()
        
        query, params = builder.build_analytics_query(
            metric=request.metric,
            group_by=request.group_by,
            filters=request.filters,
            order_by=request.order_by,
            limit=request.limit
        )
        
        cursor.execute(query, params)
        results = cursor.fetchall()
        
        return {"data": results, "status": "ok"}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except psycopg2.Error as e:
        print(f"ERRO CRÍTICO NO BANCO DE DADOS: {e}") 
        raise HTTPException(status_code=500, detail=f"Erro no Banco de Dados: {str(e)}")
    except Exception as e:
        print(f"ERRO INTERNO INESPERADO: {e}")
        raise HTTPException(status_code=500, detail=f"Erro Interno: {str(e)}")
    
@app.get("/api/v1/sales/all")
def get_all_sales(page: int = 1, page_size: int = 100, conn: Any = Depends(get_db)):
    """Retorna registros da tabela sales com paginação."""
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        offset = (page - 1) * page_size
        cursor.execute(f"SELECT * FROM sales LIMIT {page_size} OFFSET {offset};")
        results = cursor.fetchall()
        
        cursor.execute("SELECT COUNT(*) FROM sales;")
        total = cursor.fetchone()['count']
        
        return {
            "data": results,
            "page": page,
            "page_size": page_size,
            "total": total,
            "status": "ok"
        }
        
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro no Banco de Dados: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro Interno: {str(e)}")
    
@app.get("/api/v1/customers/all")
def get_all_customers(page: int = 1, page_size: int = 100, conn: Any = Depends(get_db)):
    """Retorna registros da tabela sales com paginação."""
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        offset = (page - 1) * page_size
        cursor.execute(f"SELECT * FROM sub_brands LIMIT {page_size} OFFSET {offset};")
        results = cursor.fetchall()
        
        cursor.execute("SELECT COUNT(*) FROM sub_brands;")
        total = cursor.fetchone()['count']
        
        return {
            "data": results,
            "page": page,
            "page_size": page_size,
            "total": total,
            "status": "ok"
        }
        
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro no Banco de Dados: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro Interno: {str(e)}")

@app.get("/api/v1/reference/brands") 
def get_brands(conn: Any = Depends(get_db)):
   "Retorna as marcas"
   try:
       cursor = conn.cursor(cursor_factory=RealDictCursor)
       cursor.execute("SELECT * FROM brands;")
       return {"data": cursor.fetchall(),"status":"ok"}
   except psycopg2.Error as e:
       raise HTTPException(status_code=500, detail=str(e))
   
@app.get("/api/v1/reference/sub_brands") 
def get_sub_brands(conn: Any = Depends(get_db)):
   "Retorna as sub marcas"
   try:
       cursor = conn.cursor(cursor_factory=RealDictCursor)
       cursor.execute("SELECT * FROM sub_brands;")
       return {"data": cursor.fetchall(),"status":"ok"}
   except psycopg2.Error as e:
       raise HTTPException(status_code=500, detail=str(e))
   
@app.get("/api/v1/reference/stores") 
def get_stores(conn: Any = Depends(get_db)):
   "Retorna as lojas"
   try:
       cursor = conn.cursor(cursor_factory=RealDictCursor)
       cursor.execute("SELECT * FROM stores;")
       return {"data": cursor.fetchall(),"status":"ok"}
   except psycopg2.Error as e:
       raise HTTPException(status_code=500, detail=str(e))
   
@app.get("/api/v1/reference/channels") 
def get_channels(conn: Any = Depends(get_db)):
   "Retorna os canais"
   try:
       cursor = conn.cursor(cursor_factory=RealDictCursor)
       cursor.execute("SELECT * FROM channels;")
       return {"data": cursor.fetchall(),"status":"ok"}
   except psycopg2.Error as e:
       raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/analytics/top_products")
def get_top_products(conn: Any = Depends(get_db)):
    """
    Retorna os 5 produtos mais vendidos (por quantidade total vendida).
    Este endpoint usa uma query SQL otimizada com JOINs.
    """
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        sql_query = """
            SELECT
                p.name AS product_name,
                SUM(ps.quantity) AS total_quantity_sold
            FROM product_sales ps
            JOIN products p ON ps.product_id = p.id
            JOIN sales s ON ps.sale_id = s.id
            WHERE
                s.sale_status_desc = 'COMPLETED'
            GROUP BY
                p.name
            ORDER BY
                total_quantity_sold DESC
            LIMIT 5;
        """
        
        cursor.execute(sql_query)
        results = cursor.fetchall()
        
        return {"data": results, "status": "ok"}
        
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Erro no Banco de Dados: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro Interno: {str(e)}")
    
@app.get("/api/v1/reference/products") 
def get_products(conn: Any = Depends(get_db)):
   "Retorna os produtos"
   try:
       cursor = conn.cursor(cursor_factory=RealDictCursor)
       cursor.execute("SELECT id, name FROM products;")
       return {"data": cursor.fetchall(),"status":"ok"}
   except psycopg2.Error as e:
       raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/reference/customers") 
def get_customers(conn: Any = Depends(get_db)):
   "Retorna os clientes"
   try:
       cursor = conn.cursor(cursor_factory=RealDictCursor)
       cursor.execute("SELECT id, customer_name FROM customers;")
       return {"data": cursor.fetchall(),"status":"ok"}
   except psycopg2.Error as e:
       raise HTTPException(status_code=500, detail=str(e))