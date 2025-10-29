import React,{useState,useEffect} from 'react';
import axios from 'axios';
import {PieChart,Pie,Cell,Tooltip,Legend,ResponsiveContainer} from 'recharts';
import { useLoadQueue } from "../../components/LoadQueueContext/LoadQueueContext";
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19FF'];
const Vendascanais = ({ queueIndex }) => {
  const { isMyTurnToLoad, loadCompleted } = useLoadQueue(queueIndex);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!isMyTurnToLoad) {
      return;
    }
    const buscarDadosCanal = async () => {
      setIsLoading(true);
      setError(null);
      const salesRequest = {
        metric: {
          func: 'COUNT',
          column: 'id' 
        },
        group_by: [{
          column: 'channel_id' 
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
        const [responseSales, responseChannels] = await Promise.all([
          axios.post('http://127.0.0.1:8000/api/v1/analytics/query', salesRequest),
          axios.get('http://127.0.0.1:8000/api/v1/reference/channels')
        ]);
        const salesData = responseSales.data.data;
        const channelsData = responseChannels.data.data;
        const channelMap = new Map(channelsData.map(c => [c.id, c.name]));
        const dadosCombinados = salesData.map(item => {
          const stringValor = String(item.metric_result);
          const valorLimpo = stringValor.replace(/[^0-9]/g, '');
          const valorNumerico = parseFloat(valorLimpo);
          return {
            name: channelMap.get(item.channel_id) || `Canal ID ${item.channel_id}`,
            value: isNaN(valorNumerico) ? 0 : valorNumerico 
          };
        });
        if (salesData.length === 0 && channelsData.length > 0) {
            console.warn("Vendas por Canal: A tabela 'sales' pode estar vazia.");
        }
        setDadosGrafico(dadosCombinados);
      } catch (err) {
        setError('Não foi possível carregar os dados por canal.');
        console.error(err);
      } finally {
        setIsLoading(false);
        if (!hasLoadedOnce) {
          loadCompleted();
          setHasLoadedOnce(true);
        }
      }
    };
    buscarDadosCanal();
  }, [isMyTurnToLoad, loadCompleted, hasLoadedOnce]); 
    const formatarTooltip = (value, name, payload) => {
        const totalSum = dadosGrafico.reduce((acc, entry) => acc + entry.value, 0);
        const percent = (totalSum > 0) ? (value / totalSum) * 100 : 0;
        return [
          `${value.toLocaleString('pt-BR')} vendas`, 
          `${name} (${percent.toFixed(2)}%)`
        ];
      };
  return ( 
    <div className = "dashboard-widget" >
    <div className = "widget-header">
    <h2 > Vendas por Canal </h2> 
    </div> 
    <div className = "widget-content" > 
      {isLoading && <p> Carregando gráfico... </p>} 
      {error && < p className = "error-message" > {error} </p>}
      {!isLoading && !error && dadosGrafico.length > 0 && (
          <ResponsiveContainer width = "100%" height = {300}>
            <PieChart>
              <Pie 
                data = {dadosGrafico}
                dataKey = "value" 
                nameKey = "name" 
                cx = "50%"
                cy = "50%"
                outerRadius = {100} 
                fill = "#8884d8"
                labelLine = {false}
              >
              {
                dadosGrafico.map((entry, index) => ( 
                  <Cell key = {`cell-${index}`} fill = {COLORS[index % COLORS.length]}/>
                ))
              } 
              </Pie> 
              <Tooltip formatter = {formatarTooltip}/>
              <Legend/>
            </PieChart> 
          </ResponsiveContainer>
        )
      }
      {}
      {!isLoading && !error && dadosGrafico.length === 0 && ( 
          <p > Sem dados de canal para exibir. </p>
        )
      } 
      </div> 
      </div>
    );
  };
  export default Vendascanais;