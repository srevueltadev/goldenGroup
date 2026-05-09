'use client'
import React, { useState } from 'react';

interface LoginProps {
    onLoginSuccessAction: (token: string) => void;
}

export default function Login({ onLoginSuccessAction }: LoginProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('authExpiry', String(Date.now() + data.expiresIn));
                onLoginSuccessAction(data.token);
            } else {
                setError(data.error || 'Error al iniciar sesión');
            }
        } catch {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            position: 'relative',
            backgroundColor: '#0F0F0F',
        }}>
            {/* Background glow orbs */}
            <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'rgba(242,202,80,0.05)', filter: 'blur(120px)' }} />
                <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'rgba(242,202,80,0.05)', filter: 'blur(120px)' }} />
            </div>

            <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 10 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ marginBottom: '12px' }}>
                        <img src="/icon.png" alt="logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                    </div>
                    <h1 style={{
                        fontFamily: 'var(--font-playfair), "Playfair Display", serif',
                        fontSize: '48px', fontWeight: 700, lineHeight: 1.1,
                        letterSpacing: '-0.02em', margin: 0,
                        background: 'linear-gradient(135deg, #b8860b 0%, #f2ca50 25%, #ffe87c 45%, #d4a017 60%, #f2ca50 75%, #a0720a 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        B&B <span style={{ fontWeight: 900 }}>GOLD</span>SILVER
                    </h1>
                    <p style={{
                        fontFamily: 'var(--font-inter), Inter, sans-serif',
                        fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: '#99907c',
                        marginTop: '8px', opacity: 0.8,
                    }}>
                        Institutional Wealth Management
                    </p>
                </div>

                {/* Card */}
                <div className="glass-panel" style={{ padding: '32px', borderRadius: '12px', position: 'relative', overflow: 'hidden' }}>
                    {/* Bevel top */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(242,202,80,0.3), transparent)' }} />

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Username */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#d0c5af' }}>
                                Usuario
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="Ingresa tu usuario"
                                required
                                autoComplete="username"
                                style={{
                                    background: '#1c1b1b', border: 'none',
                                    borderBottom: '2px solid #4d4635',
                                    color: '#e5e2e1', padding: '12px 4px',
                                    fontSize: '16px', outline: 'none',
                                    transition: 'border-color 0.2s',
                                    fontFamily: 'var(--font-inter), Inter, sans-serif',
                                }}
                                onFocus={e => (e.target.style.borderBottomColor = '#f2ca50')}
                                onBlur={e => (e.target.style.borderBottomColor = '#4d4635')}
                            />
                        </div>

                        {/* Password */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#d0c5af' }}>
                                Contraseña
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                                style={{
                                    background: '#1c1b1b', border: 'none',
                                    borderBottom: '2px solid #4d4635',
                                    color: '#e5e2e1', padding: '12px 4px',
                                    fontSize: '16px', outline: 'none',
                                    transition: 'border-color 0.2s',
                                    fontFamily: 'var(--font-inter), Inter, sans-serif',
                                }}
                                onFocus={e => (e.target.style.borderBottomColor = '#f2ca50')}
                                onBlur={e => (e.target.style.borderBottomColor = '#4d4635')}
                            />
                        </div>

                        {error && (
                            <div style={{
                                background: 'rgba(147, 0, 10, 0.3)', border: '1px solid rgba(255,180,171,0.2)',
                                color: '#ffb4ab', padding: '10px 14px', borderRadius: '6px',
                                fontSize: '14px', textAlign: 'center',
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="gold-gradient metallic-shine"
                            style={{
                                marginTop: '8px', padding: '16px',
                                color: '#3c2f00', fontFamily: 'var(--font-inter), Inter, sans-serif',
                                fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em',
                                textTransform: 'uppercase', border: 'none', borderRadius: '8px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1,
                                boxShadow: '0 4px 20px rgba(212,175,55,0.2)',
                                transition: 'transform 0.1s, opacity 0.2s',
                            }}
                        >
                            {loading ? 'Verificando...' : 'Entrar'}
                        </button>
                    </form>
                </div>

            </div>

            <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px', textAlign: 'center', zIndex: 10 }}>
                <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#4d4635' }}>
                    © B&B GOLDSILVER
                </p>
            </footer>
        </div>
    );
}
