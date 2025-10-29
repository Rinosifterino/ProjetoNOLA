import React, { useState } from 'react';
import './Login.css'; 

const Login = ({ onLogin }) => {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErro('');

    if (usuario === 'admin' && senha === '12345') {
      onLogin(true);
    } else {
      setErro('Usuário ou senha inválidos. Tente "admin" e "12345".');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Analytcis Restaurante</h2>
        <form onSubmit={handleSubmit}>
          {erro && <p className="login-error">{erro}</p>}

          <label htmlFor="usuario" className="login-label">Usuário</label>
          <input
            type="text"
            id="usuario"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="login-input"
            required
          />

          <label htmlFor="senha" className="login-label">Senha</label>
          <input
            type="password"
            id="senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="login-input"
            required
          />

          <button type="submit" className="login-button">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;