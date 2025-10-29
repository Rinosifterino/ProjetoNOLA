import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLoadQueue } from "../../components/LoadQueueContext/LoadQueueContext";
const formatarTooltip = (value, name, props) => {
  const nomeProduto = props.payload.product_name;
  return [`${value.toLocaleString('pt-BR')} unidades`, nomeProduto];
};
const Produtosmaisvendidos = ({ queueIndex }) => {
  const { isMyTurnToLoad, loadCompleted } = useLoadQueue(queueIndex);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!isMyTurnToLoad) {
      return;
    }
    const buscarTopProdutos = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/v1/analytics/top_products');
        setDadosGrafico(response.data.data);
      } catch (err) {
        setError('Não foi possível carregar os top produtos.');
        console.error(err);
      } finally {
        setIsLoading(false);
        if (!hasLoadedOnce) {
          loadCompleted();
          setHasLoadedOnce(true);
        }
      }
    };
    buscarTopProdutos();
  }, [isMyTurnToLoad, loadCompleted, hasLoadedOnce]);
  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h2>Top 5 Produtos Mais Vendidos</h2>
      </div>
      <div className="widget-content">
        {isLoading && <p>Carregando gráfico...</p>}
        {error && <p className="error-message">{error}</p>}
        {!isLoading && !error && dadosGrafico.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={dadosGrafico}
              layout="vertical" 
              margin={{
                top: 20,
                right: 20,
                left: 40,
                bottom: 5,}}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" /> 
              <YAxis 
                type="category" 
                dataKey="product_name"
                width={120}
                interval={0}
              />
              <Tooltip />
              <Legend />
              <Bar 
                dataKey="total_quantity_sold" 
                name="Unidades Vendidas" 
                fill="#8884d8" 
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        {!isLoading && !error && dadosGrafico.length === 0 && (
          <p>Sem dados de produtos para exibir.</p>
        )}
      </div>
    </div>
  );
};
export default Produtosmaisvendidos;