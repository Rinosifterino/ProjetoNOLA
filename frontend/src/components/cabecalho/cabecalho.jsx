import React, { useState, useEffect }  from 'react';
import axios from 'axios';
import './cabecalho.css'


function Cabecalho({onDashboardClick,onCustomClick}) {
  const [Brand, setBrand] = useState(null);

  useEffect(() => {
      axios.get('http://127.0.0.1:8000/api/v1/reference/brands' )
          .then(response => {
              const data = response.data.data;

              setBrand(data[0]);
    
          })
          .catch(error => console.error(error));
  }, []);

    return (
        <header className="cabecalho-container">

      <div className="cabecalho-logo">
        <h1>{Brand ? Brand.name : 'Carregando...'}</h1>
      </div>

        <button onClick={onDashboardClick} className='pageButton'>
          Dashboard
        </button>


        <button on onClick={onCustomClick} className='pageButton'>
          Análise Detalhada
        </button>
     
        </header>
    );
}

export default Cabecalho;