import React, { useState } from 'react';
import Dashboard from './pages/dashboard/dashboard';
import Cabecalho from './components/cabecalho/cabecalho';
import pageSwitcher from './pages/pageSwitcher/pageSwitcher' 
import AnaliseDetalhada from './pages/AnaliseDetalhada/AnaliseDetalhada';
import Login from './pages/Login/Login'; 
import './App.css';
function App() {
  const [estaLogado, setEstaLogado] = useState(false);
  const {
    pageAtual,
    irParaPaginaDashboard,
    irParaPaginaCustom
  } = pageSwitcher(1);
  const handleLogout = () => {
    setEstaLogado(false);
    irParaPaginaDashboard();
  }
  const handleLogin = (status) => {
    setEstaLogado(status);
  }
  if (!estaLogado) {
    return <Login onLogin={handleLogin} />;
  }
  return (
    <div className="App">
      <Cabecalho
        onDashboardClick={irParaPaginaDashboard}
        onCustomClick={irParaPaginaCustom}
        onLogoutClick={handleLogout}
      />
      <main>
        {pageAtual === 1 && <Dashboard/>}
        {pageAtual === 2 && <AnaliseDetalhada/>}
      </main>
    </div>
  );
}
export default App;