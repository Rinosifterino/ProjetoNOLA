import React, { useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
const QueryBuilder = () => {
    const [metric, setMetric] = useState('SUM');
    const [column, setColumn] = useState('total_amount');
    const [groupBy, setGroupBy] = useState('channel_id');
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setResults(null);
        const requestBody = {
            metric: {
                func: metric,
                column: column
            },
            group_by: [groupBy],
            filters: [
                {
                    column: 'sale_status_desc',
                    op: '=',
                    value: 'COMPLETED'
                }
            ],
            limit: 10
        };
        try {
            const response = await axios.post('http://127.0.0.1:8000/api/v1/analytics/query', requestBody);
            setResults(response.data.data);
        } catch (err) {
            setError('Ocorreu um erro ao buscar os dados. Verifique o console para mais detalhes.');
            console.error(err);
        }
    };
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <div className='filtros'>
                    <label>Métrica:</label>
                    <select value={metric} onChange={(e) => setMetric(e.target.value)}>
                        <option value="SUM">Soma</option>
                        <option value="COUNT">Contagem</option>
                        <option value="AVG">Média</option>
                    </select>
                    <select value={column} onChange={(e) => setColumn(e.target.value)}>
                        <option value="total_amount">Valor Total</option>
                        <option value="id">ID da Venda</option>
                    </select>
                    <label>Agrupar por:</label>
                    <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                        <option value="channel_id">Canal</option>
                        <option value="store_id">Loja</option>
                    </select>
                </div>
                    <button type="submit">Executar Query</button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {results && (
                <div>
                    <h2>Resultados</h2>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={results}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={groupBy} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="metric_result" fill="#ff0000ff" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};
export default QueryBuilder;
