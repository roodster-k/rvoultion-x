import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('kevin.m@clinique.be');
  const [password, setPassword] = useState('postop2026');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    // Simulated auth
    onLogin({ name: 'Kevin M.', role: 'nurse', email });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f5f54 0%, #0a4038 50%, #083830 100%)',
      padding: 20
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: 'white',
          padding: '48px 40px',
          borderRadius: 28,
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #0f5f54, #10b981)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 24, fontWeight: 800, marginBottom: 16
          }}>+</div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            color: '#0f5f54',
            fontSize: 28,
            marginBottom: 8
          }}>PostOp Tracker</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>Identification sécurisée — Clinique Churchill</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Adresse e-mail professionnelle</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="nom@clinique.be"
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 12,
                border: '1px solid #e2e8f0', fontSize: 15,
                fontFamily: "'DM Sans', sans-serif",
                outline: 'none', transition: 'border 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = '#0f5f54'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '14px 48px 14px 16px', borderRadius: 12,
                  border: '1px solid #e2e8f0', fontSize: 15,
                  fontFamily: "'DM Sans', sans-serif",
                  outline: 'none', transition: 'border 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#0f5f54'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500 }}
            >{error}</motion.div>
          )}

          <button
            type="submit"
            style={{
              marginTop: 8,
              width: '100%', padding: 16,
              background: '#0f5f54', color: 'white', border: 'none',
              borderRadius: 14, fontSize: 16, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              transition: 'background 0.2s',
              boxShadow: '0 4px 12px rgba(15,95,84,0.3)'
            }}
            onMouseEnter={e => e.target.style.background = '#0a4038'}
            onMouseLeave={e => e.target.style.background = '#0f5f54'}
          >
            Me connecter
          </button>
        </form>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, marginTop: 24,
          fontSize: 12, color: '#94a3b8'
        }}>
          <ShieldCheck size={14} />
          Connexion chiffrée TLS 1.3 · Données HDS
        </div>
      </motion.div>
    </div>
  );
}
