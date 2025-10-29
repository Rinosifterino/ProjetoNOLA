import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLoadQueue } from "../../components/LoadQueueContext/LoadQueueContext";
const formatarMoeda = (valor) => {
  if (typeof valor !== 'number') {
    return valor;
  }
  return `R$ ${valor.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};
const formatarMes = (dataString) => {
  try {
    const data = new Date(dataString);
    const mes = data.toLocaleString('pt-BR', { month: 'short', timeZone: 'UTC' });
    const ano = data.getUTCFullYear().toString().slice(-2);
    return `${mes.charAt(0).toUpperCase() + mes.slice(1)}/${ano}`;
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
const Ticketmediosimples = ({ queueIndex }) => {
  const { isMyTurnToLoad, loadCompleted } = useLoadQueue(queueIndex);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!isMyTurnToLoad) {
      return; 
    }
    const buscarDadosTicketMedio = async () => {
      setIsLoading(true);
      setError(null);
      const requestBody = {
        metric: {
          func: 'AVG',
          column: 'total_amount' 
        },
        group_by: [
          { 
            column: 'created_at', 
            granularity: 'month'
          }
        ],
        filters: [
          {
            column: 'sale_status_desc',
            op: '=',
            value: 'COMPLETED'
          }
        ],
        order_by: "date_group_field ASC" 
      };
      try {
        const response = await axios.post('http://127.0.0.1:8000/api/v1/analytics/query', requestBody);
        setDadosGrafico(response.data.data);
      } catch (err) {
        setError('Não foi possível carregar o ticket médio.');
        console.error(err);
      } finally {
        setIsLoading(false);
        if (!hasLoadedOnce) {
          loadCompleted();
          setHasLoadedOnce(true);
        }
      }
    };
    buscarDadosTicketMedio();
  }, [isMyTurnToLoad, loadCompleted, hasLoadedOnce]);
  const dataKeyGrafico = 'date_group_field';
  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h2>Ticket Médio por Mês</h2>
      </div>
      <div className="widget-content">
        {isLoading && <p>Carregando gráfico...</p>}
        {error && <p className="error-message">{error}</p>}
        {!isLoading && !error && dadosGrafico.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dadosGrafico}
              margin={{
                top: 20,
                right: 20,
                left: 40,
                bottom: 5,}}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={dataKeyGrafico} tickFormatter={formatarMes} />
              <YAxis tickFormatter={formatarMoeda} />
              <Tooltip formatter={(valor) => formatarMoeda(valor)} 
                labelFormatter={formatarLabelTooltip}
                />
              <Legend />
              <Bar 
                dataKey="metric_result" 
                name="Ticket Médio" 
                fill="#82ca9d" 
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        {!isLoading && !error && dadosGrafico.length === 0 && (
          <p>Sem dados de ticket médio para exibir.</p>
        )}
      </div>
    </div>
  );
};
export default Ticketmediosimples;