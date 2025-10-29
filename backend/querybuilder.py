from psycopg2 import sql
from typing import List, Dict, Any, Optional, Union
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class QueryBuilder:
    """
    Query Builder flexível e adaptativo para construir queries SQL de agregação.
    
    Características:
    - Aceita múltiplos formatos de entrada (strings, dicts, objetos)
    - Suporta agrupamentos simples e por granularidade de data
    - Validação rigorosa com listas de permissão
    - Geração segura de SQL usando psycopg2.sql
    - Suporte a JOINs dinâmicos
    """
    
    DATE_GROUP_ALIAS = "date_group_field"
    
    def __init__(self):
        """Inicializa o QueryBuilder com as configurações de segurança E o mapa de tabelas."""
        
        self.ALLOWED_OPERATORS = {
            "=": "=", ">": ">", "<": "<", ">=": ">=", "<=": "<=", "!=": "!=",
            "<>": "<>", "LIKE": "LIKE", "ILIKE": "ILIKE", "IN": "IN", "NOT IN": "NOT IN",
            "BETWEEN": "BETWEEN", "IS NULL": "IS NULL", "IS NOT NULL": "IS NOT NULL",
            "PERIODO_DIA": "PERIODO_DIA" 
        }
        
        self.ALLOWED_FUNCTIONS = ["SUM", "COUNT", "AVG", "MIN", "MAX", "COUNT DISTINCT"]
        
        self.ALLOWED_DATE_GRANULARITIES = ["second", "minute", "hour", "day", "week", "month", "quarter", "year","day_of_week"]

        self.main_table = "sales"
        self.main_alias = "s" 

        self.JOIN_MAP = {
            'product_sales': {
                'alias': 'ps',
                'on': sql.SQL("s.id = ps.sale_id"), 
                'allowed_metric_cols': ['quantity', 'total_price'],
                'allowed_group_by_cols': ['product_id'],
                'allowed_filter_cols': ['product_id']
            },
            'products': {
                'alias': 'p',
                'on': sql.SQL("ps.product_id = p.id"),
                'depends_on': 'product_sales', 
                'allowed_metric_cols': [],
                'allowed_group_by_cols': ['name', 'category_id'], 
                'allowed_filter_cols': ['name', 'category_id', 'id']
            },
            'delivery_addresses': {
                'alias': 'da',
                'on': sql.SQL("s.id = da.sale_id"),
                'allowed_metric_cols': [],
                'allowed_group_by_cols': ['neighborhood', 'city', 'state'], 
                'allowed_filter_cols': ['neighborhood', 'city', 'state']
            },
            'customers': {
                'alias': 'c',
                'on': sql.SQL("s.customer_id = c.id"),
                'allowed_metric_cols': [],
                'allowed_group_by_cols': ['customer_name', 'email'],
                'allowed_filter_cols': ['customer_name', 'email', 'id']
            }
        }
        
        self.ALLOWED_METRIC_COLUMNS = {
            'sales': ["total_amount", "people_quantity", "id", "delivery_seconds",
                      "total_discount", "service_tax_fee"]
        }
        self.ALLOWED_GROUP_BY_COLUMNS = {
            'sales': ["channel_id", "store_id", "customer_id", "sale_status_desc", "created_at"]
        }
        self.ALLOWED_FILTER_COLUMNS = {
            'sales': ["channel_id", "store_id", "customer_id", "sale_status_desc", "created_at",
                      "total_amount", "people_quantity", "id", "delivery_seconds"]
        }

        for table_name, config in self.JOIN_MAP.items():
            self.ALLOWED_METRIC_COLUMNS[table_name] = config['allowed_metric_cols']
            self.ALLOWED_GROUP_BY_COLUMNS[table_name] = config['allowed_group_by_cols']
            self.ALLOWED_FILTER_COLUMNS[table_name] = config['allowed_filter_cols']
            
    
    def build_analytics_query(
        self,
        metric: Union[Dict[str, str], Any],
        group_by: List[Any] = [],
        filters: List[Union[Dict[str, Any], Any]] = [],
        order_by: Optional[str] = None,
        limit: int = 100
    ) -> tuple:
        """
        Constrói uma query SQL de agregação com JOINs dinâmicos.
        """
        
        logger.info("=== Iniciando construção da query com JOINs ===")
        logger.info(f"Metric: {metric}")
        logger.info(f"Group By: {group_by}")
        logger.info(f"Filters: {filters}")
        
        metric_dict = self._normalize_metric(metric)
        normalized_group_by = self._normalize_group_by(group_by)
        normalized_filters = self._normalize_filters(filters)
        
        self._validate_metric(metric_dict)
        self._validate_columns(normalized_group_by, self.ALLOWED_GROUP_BY_COLUMNS, "agrupamento")
        self._validate_columns(normalized_filters, self.ALLOWED_FILTER_COLUMNS, "filtro")
        
        required_cols = self._get_required_columns(
            metric_dict, normalized_group_by, normalized_filters
        )
        
        from_clause = self._build_from_clause(required_cols)
        
        select_clause, group_by_clause, group_by_fields = self._build_select_and_group_by(
            metric_dict, normalized_group_by
        )
        
        where_clause, params = self._build_where_clause(normalized_filters)
        
        order_by_clause = self._build_order_by_clause(order_by, normalized_group_by)
        
        query = sql.SQL("""
            SELECT {select_clause}
            FROM {from_clause}
            WHERE {where_clause}
            {group_by_clause}
            {order_by_clause}
            LIMIT %s
        """).format(
            select_clause=select_clause,
            from_clause=from_clause,
            where_clause=where_clause,
            group_by_clause=group_by_clause,
            order_by_clause=order_by_clause
        )
        
        params.append(limit)
        
        logger.info("=== Query construída com sucesso ===")
                
        return query, params
    
    def _normalize_metric(self, metric: Any) -> Dict[str, str]:
        """Normaliza a métrica para um dicionário padrão."""
        if isinstance(metric, dict):
            return metric
        if hasattr(metric, 'func') and hasattr(metric, 'column'):
            return {'func': metric.func, 'column': metric.column}
        raise ValueError(f"Formato de métrica inválido: {metric}")
    
    def _normalize_group_by(self, group_by: List[Any]) -> List[Dict[str, Any]]:
        """Normaliza os agrupamentos para uma lista de dicionários padrão."""
        normalized = []
        for item in group_by:
            if isinstance(item, str):
                normalized.append({'column': item, 'granularity': None})
            elif isinstance(item, dict):
                normalized.append({
                    'column': item.get('column'),
                    'granularity': item.get('granularity')
                })
            elif hasattr(item, 'column'):
                normalized.append({
                    'column': item.column,
                    'granularity': getattr(item, 'granularity', None)
                })
            else:
                raise ValueError(f"Formato de agrupamento inválido: {item} (tipo: {type(item)})")
        logger.info(f"Group By normalizado: {normalized}")
        return normalized
    
    def _normalize_filters(self, filters: List[Any]) -> List[Dict[str, Any]]:
        """Normaliza os filtros para uma lista de dicionários padrão."""
        normalized = []
        for item in filters:
            if isinstance(item, dict):
                normalized.append(item)
            elif hasattr(item, 'column') and hasattr(item, 'op') and hasattr(item, 'value'):
                normalized.append({
                    'column': item.column,
                    'op': item.op,
                    'value': item.value
                })
            else:
                raise ValueError(f"Formato de filtro inválido: {item} (tipo: {type(item)})")
        logger.info(f"Filters normalizados: {normalized}")
        return normalized
    
    def _get_table_alias(self, column_name: str) -> str:
        """Descobre o alias da tabela para uma coluna (ex: 'product_id' -> 'ps')"""
        if column_name in self.ALLOWED_GROUP_BY_COLUMNS.get('sales', []) or \
           column_name in self.ALLOWED_FILTER_COLUMNS.get('sales', []) or \
           column_name in self.ALLOWED_METRIC_COLUMNS.get('sales', []):
            return self.main_alias 

        for table, config in self.JOIN_MAP.items():
            if column_name in config.get('allowed_group_by_cols', []) or \
               column_name in config.get('allowed_filter_cols', []) or \
               column_name in config.get('allowed_metric_cols', []):
                return config['alias']
        
        raise ValueError(f"Coluna não mapeada: {column_name}")

    def _get_required_columns(self, metric, group_by_list, filters) -> set:
        """Coleta todas as colunas únicas necessárias para a query."""
        cols = set()
        cols.add(metric.get('column'))
        for item in group_by_list:
            cols.add(item.get('column'))
        for item in filters:
            cols.add(item.get('column'))
        cols.discard(None) 
        return cols

    def _build_from_clause(self, required_cols: set) -> sql.SQL:
        """Constrói a cláusula FROM e os JOINs necessários."""
        from_clause = sql.SQL("{table} AS {alias}").format(
            table=sql.Identifier(self.main_table),
            alias=sql.Identifier(self.main_alias)
        )
        
        joined_tables = set()
        
        for table, config in self.JOIN_MAP.items():
            table_cols = set(config['allowed_metric_cols'] + config['allowed_group_by_cols'] + config['allowed_filter_cols'])
            if not required_cols.isdisjoint(table_cols): 
                
                dependency = config.get('depends_on')
                if dependency and dependency not in joined_tables:
                    dep_config = self.JOIN_MAP[dependency]
                    join_sql = sql.SQL(" JOIN {table} AS {alias} ON {on}").format(
                        table=sql.Identifier(dependency),
                        alias=sql.Identifier(dep_config['alias']),
                        on=dep_config['on']
                    )
                    from_clause += join_sql
                    joined_tables.add(dependency)

                if table not in joined_tables:
                    join_sql = sql.SQL(" JOIN {table} AS {alias} ON {on}").format(
                        table=sql.Identifier(table),
                        alias=sql.Identifier(config['alias']),
                        on=config['on']
                    )
                    from_clause += join_sql
                    joined_tables.add(table)
                
        return from_clause

    def _build_select_and_group_by(
        self, 
        metric: Dict[str, str], 
        group_by: List[Dict[str, Any]]
    ) -> tuple:
        """Constrói as cláusulas SELECT e GROUP BY (com aliases)."""
        select_parts = []
        group_by_parts = []
        group_by_fields = []
        
        for item in group_by:
            column = item['column']
            granularity = item['granularity']
            
            alias = self._get_table_alias(column)
            
            if granularity is None:
                col_identifier = sql.SQL("{alias}.{col}").format(
                    alias=sql.Identifier(alias),
                    col=sql.Identifier(column)
                )
                select_parts.append(col_identifier)
                group_by_parts.append(col_identifier)
                group_by_fields.append(column)
            
            else:
                if column != 'created_at':
                    raise ValueError("Granularidade só é permitida em 'created_at'.")
                
                col_identifier = sql.SQL("{alias}.{col}").format(
                    alias=sql.Identifier(alias),
                    col=sql.Identifier(column)
                )
                
                date_expr = None
                
                if granularity == 'day_of_week':
                    date_expr = sql.SQL("EXTRACT(DOW FROM {col})").format(col=col_identifier)
                
                elif granularity == 'hour':
                    date_expr = sql.SQL("DATE_TRUNC('hour', {col})").format(col=col_identifier)
                
                else:
                    date_expr = sql.SQL("DATE_TRUNC({granularity}, {col})").format(
                        granularity=sql.Literal(granularity),
                        col=col_identifier
                    )
                
                select_parts.append(
                    sql.SQL("{expr} AS {alias}").format(
                        expr=date_expr,
                        alias=sql.Identifier(self.DATE_GROUP_ALIAS)
                    )
                )
                group_by_parts.append(date_expr)
                group_by_fields.append(self.DATE_GROUP_ALIAS)
        
        metric_func = sql.SQL(metric["func"])
        metric_col_name = metric["column"]
        metric_alias = self._get_table_alias(metric_col_name)
        
        metric_col = sql.SQL("{alias}.{col}").format(
            alias=sql.Identifier(metric_alias),
            col=sql.Identifier(metric_col_name)
        )
        metric_expr = sql.SQL("{func}({col}) AS metric_result").format(
            func=metric_func,
            col=metric_col
        )
        select_parts.append(metric_expr)
        
        select_clause = sql.SQL(", ").join(select_parts)
        
        if group_by_parts:
            group_by_clause = sql.SQL("GROUP BY ") + sql.SQL(", ").join(group_by_parts)
        else:
            group_by_clause = sql.SQL("")
        
        return select_clause, group_by_clause, group_by_fields
    
    def _build_where_clause(self, filters: List[Dict[str, Any]]) -> tuple:
        """Constrói a cláusula WHERE (com aliases)."""
        where_conditions = []
        params = []
        
        for filter_item in filters:
            column_name = filter_item["column"]
            operator = filter_item["op"]
            value = filter_item["value"]
            
            if operator not in self.ALLOWED_OPERATORS:
                if operator != 'PERIODO_DIA':
                    raise ValueError(f"Operador não permitido: {operator}")
            
            alias = self._get_table_alias(column_name)
            
            column = sql.SQL("{alias}.{col}").format(
                alias=sql.Identifier(alias),
                col=sql.Identifier(column_name)
            )
            
            if operator == 'PERIODO_DIA':
                if column_name != 'created_at':
                    raise ValueError("Operador 'PERIODO_DIA' só pode ser usado na coluna 'created_at'.")
                if not isinstance(value, (list, tuple)) or len(value) != 2:
                    raise ValueError(f"Operador 'PERIODO_DIA' requer uma lista de 2 valores. Recebido: {value}")
                
                where_conditions.append(
                    sql.SQL("EXTRACT(HOUR FROM {col}) BETWEEN %s AND %s").format(col=column)
                )
                params.extend(value)

            elif operator in ["IS NULL", "IS NOT NULL"]:
                where_conditions.append(sql.SQL("{col} {op}").format(col=column, op=sql.SQL(operator)))
            
            elif operator == "BETWEEN":
                if not isinstance(value, (list, tuple)) or len(value) != 2:
                    raise ValueError(f"BETWEEN requer uma lista de 2 valores. Recebido: {value}")
                where_conditions.append(sql.SQL("{col} BETWEEN %s AND %s").format(col=column))
                params.extend(value)
            
            elif operator in ["IN", "NOT IN"]:
                if not isinstance(value, (list, tuple)):
                    raise ValueError(f"{operator} requer uma lista de valores. Recebido: {value}")
                placeholders = sql.SQL(", ").join([sql.SQL("%s")] * len(value))
                where_conditions.append(sql.SQL("{col} {op} ({placeholders})").format(
                    col=column, op=sql.SQL(operator), placeholders=placeholders
                ))
                params.extend(value)
            
            else:
                where_conditions.append(sql.SQL("{col} {op} %s").format(col=column, op=sql.SQL(operator)))
                params.append(value)
        
        if where_conditions:
            where_clause = sql.SQL(" AND ").join(where_conditions)
        else:
            where_clause = sql.SQL("1=1")
        
        return where_clause, params
    
    
    def _build_order_by_clause(
        self, 
        order_by: Optional[str], 
        group_by: List[Dict[str, Any]]
    ) -> sql.SQL:
        """Constrói a cláusula ORDER BY de forma segura."""
        
        order_by_col = "metric_result"
        order_by_dir = "DESC"
        has_date_grouping = any(item.get('granularity') for item in group_by)
        
        if not order_by:
            if has_date_grouping:
                order_by_col = self.DATE_GROUP_ALIAS
                order_by_dir = "ASC"
        else:
            parts = order_by.strip().split()
            if len(parts) > 2 or len(parts) == 0:
                raise ValueError(f"Formato de 'order_by' inválido: {order_by}")
            
            column_name = parts[0]
            
            allowed_cols = [self.DATE_GROUP_ALIAS, "metric_result"]
            for item in group_by:
                if not item.get('granularity'):
                    allowed_cols.append(item.get('column'))

            if column_name not in allowed_cols:
                 raise ValueError(f"Coluna de 'order_by' não permitida: {column_name}. Permitidas: {allowed_cols}")
            
            order_by_col = column_name
            
            if len(parts) == 2:
                direction = parts[1].upper()
                if direction not in ["ASC", "DESC"]:
                    raise ValueError(f"Direção de 'order_by' inválida: {direction}")
                order_by_dir = direction

        return sql.SQL("ORDER BY {column} {direction}").format(
            column=sql.Identifier(order_by_col),
            direction=sql.SQL(order_by_dir)
        )
    
    def _validate_metric(self, metric: Dict[str, str]):
        """Valida a métrica (usando o novo mapa)."""
        func = metric.get("func", "").upper()
        column = metric.get("column")
        
        if func not in self.ALLOWED_FUNCTIONS:
            raise ValueError(f"Função de agregação não permitida: {func}")
        
        is_allowed = False
        for table_cols in self.ALLOWED_METRIC_COLUMNS.values():
            if column in table_cols:
                is_allowed = True
                break
        
        if not is_allowed:
            raise ValueError(f"Coluna de métrica não permitida: {column}")

    def _validate_columns(self, items: List[Dict], allowed_map: Dict, col_type: str):
        """Valida se as colunas são permitidas (usando o novo mapa)."""
        for item in items:
            col = item.get("column")
            if not col: continue
            
            is_allowed = False
            for table_cols in allowed_map.values():
                if col in table_cols:
                    is_allowed = True
                    break
            
            if not is_allowed:
                raise ValueError(f"Coluna de {col_type} não permitida: {col}")