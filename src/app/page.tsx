'use client'
import { useState, useEffect } from 'react';
import Formulario from "@/app/Formulario";
import Login from "@/app/Login";

function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;

  const token = localStorage.getItem('authToken');
  const expiry = localStorage.getItem('authExpiry');

  if (!token || !expiry) return false;

  // Check if token has expired
  if (Date.now() > parseInt(expiry)) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authExpiry');
    return false;
  }

  return true;
}

export default function Page() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthenticated(isAuthenticated());
    setLoading(false);
  }, []);

  const handleLoginSuccess = () => {
    setAuthenticated(true);
  };

  if (loading) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Login onLoginSuccessAction={handleLoginSuccess} />;
  }

  return <Formulario />;
}
