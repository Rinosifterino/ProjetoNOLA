import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CSVLink } from 'react-csv'; 
import './AnaliseDetalhada.css'
const formatarMoeda = (valor) => `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatarTempo = (segundos) => `${Math.round(segundos / 60)} min`;
const formatarEixoY = (valor, key) => {
  if (key === 'tempo_entrega') return formatarTempo(valor);
  if (key === 'desconto' || key === 'taxa') return formatarMoeda(valor);
  if (valor >= 1000000) return `R$ ${(valor / 1000000).toFixed(1)}M`;
  if (valor >= 1000) return `R$ ${(valor / 1000).toFixed(0)}k`;
  return `R$ ${valor}`;
};
const metricOptions = [
  { key: 'faturamento', label: 'Faturamento (Soma)', value: { func: 'SUM', column: 'total_amount' } },
  { key: 'vendas', label: 'Vendas (Contagem)', value: { func: 'COUNT', column: 'id' } },
  { key: 'ticket_medio', label: 'Ticket Médio (Média)', value: { func: 'AVG', column: 'total_amount' } },
  { key: 'tempo_entrega', label: 'Tempo de Entrega (Média)', value: { func: 'AVG', column: 'delivery_seconds' } },
  { key: 'desconto', label: 'Valor Desconto (Média)', value: { func: 'AVG', column: 'total_discount' } },
  { key: 'taxa', label: 'Valor Taxa (Média)', value: { func: 'AVG', column: 'service_tax_fee' } }
];
const groupByOptions = [
  { 
   key: 'channel_id', 
   label: 'por Canal', 
   value: { column: 'channel_id' },
   apiDataKey: 'channel_id',
    csvHeader: 'Canal'
  },
  { 
   key: 'store_id', 
   label: 'por Loja', 
   value: { column: 'store_id' },
   apiDataKey: 'store_id',
    csvHeader: 'Loja'
  },
  { 
   key: 'product_name', 
   label: 'por Produto', 
   value: { column: 'name' }, 
   apiDataKey: 'name',
    csvHeader: 'Produto'
  },
  { 
   key: 'customer_name', 
   label: 'por Cliente', 
   value: { column: 'customer_name' }, 
   apiDataKey: 'customer_name',
    csvHeader: 'Cliente'
  },
  { 
   key: 'day_of_week', 
   label: 'por Dia da Semana', 
   value: { column: 'created_at', granularity: 'day_of_week' }, 
   apiDataKey: 'date_group_field',
    csvHeader: 'Dia da Semana'
  },
  { 
   key: 'hour', 
   label: 'por Hora do Dia', 
   value: { column: 'created_at', granularity: 'hour' },
   apiDataKey: 'date_group_field',
    csvHeader: 'Hora'
  }
];
const periodosOptions = [
  { key: 'este_mes', label: 'Este Mês' },
  { key: 'mes_passado', label: 'Mês Passado' },
  { key: 'esta_semana', label: 'Esta Semana' },
  { key: 'semana_passada', label: 'Semana Passada' },
  { key: 'hoje', label: 'Hoje' },
  { key: 'dia_especifico', label: 'Um dia específico...' },
  { key: 'intervalo', label: 'Intervalo customizado...' },
];
const periodoDiaOptions = [
  { key: 'todos', label: 'Dia Inteiro' },
  { key: 'madrugada', label: 'Madrugada (00h-06h)', value: [0, 6] },
  { key: 'manha', label: 'Manhã (07h-11h)', value: [7, 11] },
  { key: 'almoco', label: 'Almoço (12h-14h)', value: [12, 14] },
  { key: 'tarde', label: 'Tarde (15h-17h)', value: [15, 17] },
  { key: 'noite', label: 'Noite (18h-23h)', value: [18, 23] }
];
const getFiltrosDeData = (periodoKey, dataInicioStr, dataFimStr) => {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth(); 
  const dia = agora.getDate(); 
  const corrigirFuso = (dataStr) => {
   if (!dataStr) return null; 
   const [ano, mes, dia] = dataStr.split('-').map(Number);
   return new Date(ano, mes - 1, dia, 0, 0, 0); 
  };
  let dataInicio, dataFim;
  switch (periodoKey) {
   case 'hoje':
   dataInicio = new Date(ano, mes, dia, 0, 0, 0);
   dataFim = new Date(ano, mes, dia, 23, 59, 59);
   break;
   case 'esta_semana':
   const primeiroDiaSemana = dia - agora.getDay(); 
   dataInicio = new Date(ano, mes, primeiroDiaSemana, 0, 0, 0);
   dataFim = new Date(ano, mes, primeiroDiaSemana + 6, 23, 59, 59); 
   break;
   case 'semana_passada':
   const primeiroDiaSemanaPassada = new Date(ano, mes, dia - agora.getDay() - 7, 0, 0, 0);
   const ultimoDiaSemanaPassada = new Date(ano, mes, dia - agora.getDay() - 1, 23, 59, 59);
   dataInicio = primeiroDiaSemanaPassada;
   dataFim = ultimoDiaSemanaPassada;
   break;
   case 'mes_passado':
   dataInicio = new Date(ano, mes - 1, 1, 0, 0, 0);
   dataFim = new Date(ano, mes, 0, 23, 59, 59); 
   break;
   case 'dia_especifico':
   dataInicio = corrigirFuso(dataInicioStr); 
   if (!dataInicio) return []; 
   dataFim = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate(), 23, 59, 59);
   break;
   case 'intervalo':
   dataInicio = corrigirFuso(dataInicioStr); 
   const dataFimTemp = corrigirFuso(dataFimStr); 
   if (!dataInicio || !dataFimTemp) return []; 
   dataFim = new Date(dataFimTemp.getFullYear(), dataFimTemp.getMonth(), dataFimTemp.getDate(), 23, 59, 59);
   break;
   case 'este_mes':
   default:
   dataInicio = new Date(ano, mes, 1, 0, 0, 0);
   dataFim = new Date(ano, mes + 1, 0, 23, 59, 59); 
   break;
  }
  if (!dataInicio || !dataFim) return [];
  return [
   { column: 'created_at', op: '>=', value: dataInicio.toISOString() },
   { column: 'created_at', op: '<=', value: dataFim.toISOString() }
  ];
};

const formatarNomeCurto = (nome) => {
  if (!nome) return '';
  const partes = nome.split(' - ');
  if (partes.length === 1) {
    return nome.split(' ')[0];
  }
  return partes[0];
};

const formatarNomeEixo = (nome) => {
  if (!nome) return '';
  const partePrincipal = nome.split(' - ')[0];
  const primeiraPalavra = partePrincipal.split(' ')[0];
    if (primeiraPalavra.length > 10) {
    return `${primeiraPalavra.substring(0, 10)}...`;
  }
  return primeiraPalavra;
};

const AnaliseDetalhada = () => {
  const [channelsList, setChannelsList] = useState([]);
  const [storesList, setStoresList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [metricKey, setMetricKey] = useState('faturamento');
  const [groupByKey, setGroupByKey] = useState('channel_id');
  const [selectedChannel, setSelectedChannel] = useState(''); 
  const [selectedStore, setSelectedStore] = useState(''); 
  const [selectedProduct, setSelectedProduct] = useState(''); 
  const [selectedCustomer, setSelectedCustomer] = useState(''); 
  const [periodoKey, setPeriodoKey] = useState('este_mes'); 
  const [periodoDiaKey, setPeriodoDiaKey] = useState('todos'); 
  const [dataInicio, setDataInicio] = useState(''); 
  const [dataFim, setDataFim] = useState('');
  const [results, setResults] = useState(null);
  const [csvData, setCsvData] = useState([]); 
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeMetricKey, setActiveMetricKey] = useState('faturamento');
  useEffect(() => {
   const fetchFilterData = async () => {
   try {
   const [responseChannels, responseStores, responseProducts, responseCustomers] = await Promise.all([
   axios.get('http://127.0.0.1:8000/api/v1/reference/channels'),
   axios.get('http://127.0.0.1:8000/api/v1/reference/stores'),
   axios.get('http://127.0.0.1:8000/api/v1/reference/products'), 
   axios.get('http://127.0.0.1:8000/api/v1/reference/customers') 
   ]);
   setChannelsList(responseChannels.data.data);
   setStoresList(responseStores.data.data);
   setProductsList(responseProducts.data.data);
   setCustomersList(responseCustomers.data.data);
   } catch (err) {
   setError('Não foi possível carregar as opções de filtro.');
   console.error(err);
   }
   };
   fetchFilterData();
  }, []);
  const handleSubmit = async (e) => {
   e.preventDefault();
   setIsLoading(true);
   setError(null);
   setResults(null);
   setCsvData([]); 
   setCsvHeaders([]);
    const filters = [
   { column: 'sale_status_desc', op: '=', value: 'COMPLETED' }
   ];
   if (selectedChannel) {
   filters.push({ column: 'channel_id', op: '=', value: parseInt(selectedChannel) });
   }
   if (selectedStore) {
   filters.push({ column: 'store_id', op: '=', value: parseInt(selectedStore) });
   }
   if (selectedProduct) {
   filters.push({ column: 'id', op: '=', value: parseInt(selectedProduct) });
  S }
   if (selectedCustomer) {
   filters.push({ column: 'id', op: '=', value: parseInt(selectedCustomer) });
   }
   if (periodoDiaKey !== 'todos') {
   const periodoDia = periodoDiaOptions.find(p => p.key === periodoDiaKey);
   if (periodoDia) {
   filters.push({
   column: 'created_at',
   op: 'PERIODO_DIA', 
   value: periodoDia.value 
   });
   }
   }
   const filtrosDeData = getFiltrosDeData(periodoKey, dataInicio, dataFim);
   filters.push(...filtrosDeData);
   const selectedMetricOption = metricOptions.find(opt => opt.key === metricKey);
   const selectedGroupByOption = groupByOptions.find(opt => opt.key === groupByKey);
   if (!selectedGroupByOption || !selectedMetricOption) {
   setError("Ocorreu um erro: Opção de métrica ou agrupamento inválida.");
   setIsLoading(false);
   return;
   }
   let orderBy = "metric_result DESC"; 
   if (selectedGroupByOption.apiDataKey === 'date_group_field') {
   orderBy = "date_group_field ASC";
   }
   const requestBody = {
   metric: selectedMetricOption.value,
   group_by: [selectedGroupByOption.value],
   filters: filters, 
   order_by: orderBy, 
   limit: (selectedGroupByOption.key === 'hour') ? 300 : 50
   };
   const dataKeyForTranslation = selectedGroupByOption.key;
   const apiDataKey = selectedGroupByOption.apiDataKey;
   try {
   const response = await axios.post('http://127.0.0.1:8000/api/v1/analytics/query', requestBody);
   const data = response.data.data;
   if (data.length > 0) {
   let translatedData = data;
   const dowMap = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
   if (dataKeyForTranslation === 'channel_id') {
   const channelMap = new Map(channelsList.map(c => [c.id, c.name]));
   translatedData = data.map(item => ({ ...item, name: channelMap.get(item[apiDataKey]) || `ID ${item[apiDataKey]}` }));
   }
   else if (dataKeyForTranslation === 'store_id') {
   const storeMap = new Map(storesList.map(s => [s.id, s.name]));
   translatedData = data.map(item => ({ ...item, name: storeMap.get(item[apiDataKey]) || `ID ${item[apiDataKey]}` }));
   }
   else if (dataKeyForTranslation === 'product_name') {
   translatedData = data.map(item => ({ ...item, name: item[apiDataKey] }));
   }
   else if (dataKeyForTranslation === 'customer_name') {
   translatedData = data.map(item => ({ ...item, name: item[apiDataKey] }));
   }
   else if (dataKeyForTranslation === 'day_of_week') {
   translatedData = data.map(item => ({ ...item, name: dowMap[item[apiDataKey]] || `Dia ${item[apiDataKey]}` }));
   }
   else if (dataKeyForTranslation === 'hour') {
   translatedData = data.map(item => {
   const dataString = item[apiDataKey]; let horaFormatada = dataString;
   try { const data = new Date(dataString); horaFormatada = `${data.getUTCHours()}:00`; } catch (e) {}
   return { ...item, name: horaFormatada };
   });
   }
   else if (dataKeyForTranslation === 'status') {
   translatedData = data.map(item => ({ ...item, name: item[apiDataKey] }));
   }
   setResults(translatedData);
        const groupHeader = selectedGroupByOption.csvHeader || 'Grupo';
        const metricHeader = selectedMetricOption.label;
        const headers = [
          { label: groupHeader, key: 'groupName' },
          { label: metricHeader, key: 'metricValue' }
        ];
        const dataToExport = translatedData.map(item => ({
            groupName: item.name,
            metricValue: item.metric_result
        }));
        setCsvHeaders(headers);
        setCsvData(dataToExport);
        setActiveMetricKey(metricKey);
   } else {
   setResults([]);
   setCsvData([]);
   setActiveMetricKey(metricKey);
   }
   } catch (err) {
   setError('Ocorreu um erro ao gerar o relatório.');
   setCsvData([]);
   console.error(err);
   } finally {
   setIsLoading(false);
   }
  };
  return (
   <div className="analise-container">

      <form className="painel-filtros" onSubmit={handleSubmit}>
          <h3>Construtor de Relatórios</h3>

        <div className="filtro-grupo">
            <label>1. O que medir?</label>
            <select value={metricKey} onChange={(e) => setMetricKey(e.target.value)}>
            {metricOptions.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
           </select>
        </div>

        <div className="filtro-grupo">
          <label>2. Como agrupar?</label>
          <select value={groupByKey} onChange={(e) => setGroupByKey(e.target.value)}>
            {groupByOptions.map(option => (
            <option key={option.key} value={option.key}>
             {option.label}
            </option>
            ))}
          </select>
        </div>

        <div className="filtro-grupo">
          <label>3. Quais filtros aplicar? (Opcional)</label>

          <select value={selectedChannel} onChange={(e) => setSelectedChannel(e.target.value)}>
            <option value="">-- Todos os Canais --</option>
             {channelsList.map(channel => (
            <option key={channel.id} value={channel.id}>{channel.name}</option>
            ))}
          </select>

          <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
            <option value="">-- Todas as Lojas --</option>
              {storesList.map(store => (
            <option 
            key={store.id} 
            value={store.id}>
            {formatarNomeCurto(store.name)}
            </option>
            ))}
          </select>

          <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
            <option value="">-- Todos os Produtos --</option>
              {productsList.map(product => (
            <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>

          <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
            <option value="">-- Todos os Clientes --</option>
              {customersList.map(customer => (
            <option key={customer.id} value={customer.id}>{customer.customer_name}</option>
            ))}
          </select>

        </div>

        <div className="filtro-grupo">
          <label>4. Quando?</label>
          <select value={periodoKey} onChange={(e) => setPeriodoKey(e.target.value)}>
            {periodosOptions.map(opt => (
             <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
          {periodoKey === 'dia_especifico' && (
          <div className="filtro-linha-data">
            <label>Data:</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          )}
          {periodoKey === 'intervalo' && (
          <div className="filtro-linha-data">
            <label>De:</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
             <label>Até:</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          )}
          <label>Período do Dia:</label>
          <select value={periodoDiaKey} onChange={(e) => setPeriodoDiaKey(e.target.value)}>
            {periodoDiaOptions.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'A gerar...' : 'Gerar Relatório'}
        </button>
      </form>

      <div className="area-resultados">
      {isLoading && <p>A carregar gráfico...</p>}
      {error && <p className="error-message">{error}</p>}
      {}
      {!isLoading && !error && results && results.length > 0 && (
              <>
                <div style={{ textAlign: 'right', marginBottom: '10px' }}>
                  <CSVLink
                    data={csvData}
                    headers={csvHeaders}
                    separator={";"}
                    filename={`relatorio_${metricKey}_por_${groupByKey}.csv`}
                    className="botao-csv"
                    target="_blank"
                  >
                    Exportar para CSV
                  </CSVLink>
                </div>
          <ResponsiveContainer 
            width="100%" 
            height={400}>
          <BarChart data={results} 
            margin={{ 
              top: 20, 
              right: 30, 
              left: 50, 
              bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
          dataKey="name" 
          angle={-45} 
          textAnchor="end" 
          interval={"auto"} 
          height={70} 
          tickFormatter={formatarNomeEixo}/>
          <YAxis tickFormatter={(value) => formatarEixoY(value, activeMetricKey)} />
            <Tooltip formatter={(value) => {
              const activeMetric = metricOptions.find(m => m.key === activeMetricKey);
              if (activeMetric.key === 'tempo_entrega') return formatarTempo(value);
              if (activeMetric.key === 'vendas') return `${value.toLocaleString('pt-BR')} vendas`;
              return formatarMoeda(value);
            }} />
          <Legend />
          <Bar 
              dataKey="metric_result" 
              name={metricOptions.find(m => m.key === activeMetricKey)?.label || "Resultado"}
              fill="#8884d8" 
            />
          </BarChart>
          </ResponsiveContainer>
              </>
      )}
      {!isLoading && !error && results && results.length === 0 && (
      <p>Nenhum dado encontrado para esta combinação de filtros.</p>
      )}
      </div>
   </div>
  );
};
export default AnaliseDetalhada;