import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './faturamentosimples.css'
const getFiltrosDeData = (periodoKey) => {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth(); 
  const dia = agora.getDate(); 
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
    case 'mes_passado':
      dataInicio = new Date(ano, mes - 1, 1, 0, 0, 0);
      dataFim = new Date(ano, mes, 0, 23, 59, 59); 
      break;
    case 'este_mes':
    default:
      dataInicio = new Date(ano, mes, 1, 0, 0, 0);
      dataFim = new Date(ano, mes + 1, 0, 23, 59, 59); 
      break;
  }
  return [
    {
      column: 'created_at',
      op: '>=',
      value: dataInicio.toISOString()
    },
    {
      column: 'created_at',
      op: '<=',
      value: dataFim.toISOString()
    }
  ];
};
const periodosFiltro = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'esta_semana', label: 'Esta Semana' },
  { key: 'este_mes', label: 'Este Mês' },
  { key: 'mes_passado', label: 'Mês Passado' },
];
const formatarMoeda = (valor) => `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatarDataEixo = (dataString) => {
  try {
    const data = new Date(dataString);
    const dia = data.getUTCDate(); 
    const mes = data.toLocaleString('pt-BR', { month: 'short', timeZone: 'UTC' });
    return `${dia}/${mes.charAt(0).toUpperCase() + mes.slice(1)}`;
  } catch (e) {
    return dataString; 
  }
};
const formatarLabelTooltip = (dataString) => {
  try {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC' 
    });
  } catch (e) {
    return dataString;
  }
};
const Faturamentosimples = () => {
  const [periodoAtivo, setPeriodoAtivo] = useState('este_mes');
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    const buscarDadosFaturamento = async () => {
      setIsLoading(true);
      setError(null);
      const filtrosDeData = getFiltrosDeData(periodoAtivo);
      const requestBody = {
        metric: {
          func: 'SUM',
          column: 'total_amount'
        },
        group_by: [
          { column: 'created_at', granularity: 'day' }
        ],
        filters: [
          {
            column: 'sale_status_desc', 
            op: '=',
            value: 'COMPLETED'
          },
          ...filtrosDeData 
        ],
        order_by: "date_group_field ASC", 
        limit: 100
      };
      try {
        const response = await axios.post('http://127.0.0.1:8000/api/v1/analytics/query', requestBody );
        setDadosGrafico(response.data.data);
      } catch (err) {
        setError('Não foi possível carregar os dados do faturamento. Verifique o CORS e o Backend.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    buscarDadosFaturamento();
  }, [periodoAtivo]);
  const dataKeyGrafico = 'date_group_field'; 
  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h2>Faturamento ao Longo do Tempo</h2>
        <div className="periodo-filtros">
          {periodosFiltro.map((periodo) => (
            <button
              key={periodo.key}
              className={periodoAtivo === periodo.key ? 'ativo' : ''}
              onClick={() => setPeriodoAtivo(periodo.key)}
            >
              {periodo.label}
            </button>
          ))}
        </div>
      </div>
      <div className="widget-content">
        {isLoading && <p>Carregando gráfico...</p>}
        {error && <p className="error-message">{error}</p>}
        {!isLoading && !error && dadosGrafico.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart 
            data={dadosGrafico}
            margin={{
                top: 20,
                right: 20,
                left: 40, 
                bottom: 5,
            }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={dataKeyGrafico} 
                tickFormatter={formatarDataEixo} 
              />
              <YAxis tickFormatter={formatarMoeda} />
              <Tooltip formatter={(valor) => formatarMoeda(valor)} 
                labelFormatter={formatarLabelTooltip}
                />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="metric_result" 
                name="Faturamento" 
                stroke="#8884d8" 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        {!isLoading && !error && dadosGrafico.length === 0 && (
          <p>Sem dados para exibir neste período.</p>
        )}
      </div>
    </div>
  );
};
export default Faturamentosimples;