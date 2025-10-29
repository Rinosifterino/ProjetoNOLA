import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { useLoadQueue } from "../../components/LoadQueueContext/LoadQueueContext";

const formatarMoeda = (valor) => `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatarEixoY = (valor) => {
  if (typeof valor !== 'number') return valor;
  if (valor >= 1000000) {
    return `R$ ${(valor / 1000000).toFixed(1)}M`;
  }
  if (valor >= 1000) {
    return `R$ ${(valor / 1000).toFixed(0)}k`;
  }
  return `R$ ${valor}`;
};

const formatarNomeCurto = (nome) => {
  if (!nome) return '';
  const partes = nome.split(' - ');
  if (partes.length === 1) {
    return nome.split(' ')[0];
  }
  return partes[0];
};

const FaturamentoPorLoja = ({ queueIndex }) => {
  
  const { isMyTurnToLoad, loadCompleted } = useLoadQueue(queueIndex);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    
    if (!isMyTurnToLoad) {
      return;
    }
    
    const buscarDadosLoja = async () => {
      setIsLoading(true); 
      setError(null);

      const salesRequest = {
        metric: {
          func: 'SUM',
          column: 'total_amount' 
        },
        group_by: [{
          column: 'store_id' 
        }],
        filters: [{
          column: 'sale_status_desc',
          op: '=',
          value: 'COMPLETED'
        }],
        order_by: "metric_result DESC",
        limit: 10 
      };

      try {
        const [responseSales, responseStores] = await Promise.all([
          axios.post('http://127.0.0.1:8000/api/v1/analytics/query', salesRequest),
          axios.get('http://127.0.0.1:8000/api/v1/reference/stores')
        ]);

        const salesData = responseSales.data.data;
        const storesData = responseStores.data.data;

        const storeMap = new Map(storesData.map(s => [s.id, s.name]));

        const dadosCombinados = salesData.map(item => {
          return {
            name: storeMap.get(item.store_id) || `Loja ID ${item.store_id}`,
            value: parseFloat(item.metric_result) 
          };
        });

        setDadosGrafico(dadosCombinados);

      } catch (err) {
        setError('Não foi possível carregar os dados por loja.');
        console.error(err);
      } finally {
        setIsLoading(false);
        
        if (!hasLoadedOnce) {
          loadCompleted();
          setHasLoadedOnce(true);
        }
      }
    };

    buscarDadosLoja();

  }, [isMyTurnToLoad, loadCompleted, hasLoadedOnce]); 

  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h2>Faturamento por Loja (Top 10)</h2>
      </div>

      <div className="widget-content">
        {isLoading && <p>Carregando gráfico...</p>}
        {error && <p className="error-message">{error}</p>}
        
        {!isLoading && !error && dadosGrafico.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={dadosGrafico}
              margin={{
                top: 20,
                right: 20,
                left: 40, 
                bottom: 5,}}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              interval={0} 
              height={70} 
              tickFormatter={formatarNomeCurto}
              /> 
              <YAxis 
              tickFormatter={formatarEixoY} />
              <Tooltip formatter={formatarMoeda} />
              <Legend wrapperStyle={{ paddingTop: '30px' }} />
              <Bar 
                dataKey="value"
                name="Faturamento" 
                fill="#00C49F" 
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        
        {!isLoading && !error && dadosGrafico.length === 0 && (
          <p>Sem dados de faturamento por loja para exibir.</p>
        )}
      </div>
    </div>
  );
};

export default FaturamentoPorLoja;