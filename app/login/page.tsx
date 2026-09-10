
// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  FolderOpen,
  Clock,
  Shield,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { signIn } from '../lib/documents';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      router.push('/');
    } catch (err: any) {
      console.error('Erro no login:', err);
      setError('Usuário ou senha inválidos');
    } finally {
      setLoading(false);
    }
  };

  const inputWrapperStyle = (focused: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    backgroundColor: focused ? '#1e3a5f' : '#0f1e3a',
    border: `1px solid ${focused ? '#3b82f6' : 'rgba(59, 130, 246, 0.2)'}`,
    borderRadius: '0.75rem',
    padding: '0.875rem 1rem',
    transition: 'all 0.2s',
    boxShadow: focused ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
  });

  const inputStyle: React.CSSProperties = {
    flex: 1,
    background: 'transparent',
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#ffffff',
    WebkitTextFillColor: '#ffffff',
    caretColor: '#ffffff',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    boxShadow: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background:
          'linear-gradient(135deg, #0a1628 0%, #0f1e3a 50%, #0a1628 100%)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Imagem de fundo */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'url("https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=1920&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.25,
        }}
      />

      {/* Overlay escuro */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.75) 50%, rgba(10,22,40,0.95) 100%)',
        }}
      />

      {/* Conteúdo */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          display: 'flex',
          minHeight: '100vh',
        }}
      >
        {/* Lado Esquerdo */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '3rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '3rem',
                height: '3rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
              }}
            >
              <FileText color="white" size={24} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'white',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                SGI <span style={{ color: '#3b82f6' }}>Docs</span>
              </h1>
              <p
                style={{
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  margin: 0,
                  letterSpacing: '0.02em',
                }}
              >
                Gestão Inteligente de Documentos
              </p>
            </div>
          </div>

          <div style={{ maxWidth: '620px' }}>
            <h2
              style={{
                fontSize: '3.25rem',
                fontWeight: 800,
                color: 'white',
                margin: '0 0 1.25rem 0',
                lineHeight: '1.1',
                letterSpacing: '-0.03em',
              }}
            >
              Tudo o que você precisa,
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                em um só lugar.
              </span>
            </h2>
            <p
              style={{
                fontSize: '1.125rem',
                color: '#cbd5e1',
                margin: '0 0 3rem 0',
                lineHeight: '1.6',
                maxWidth: '480px',
              }}
            >
              Centralize, organize e acesse seus documentos com segurança,
              agilidade e inteligência.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1.5rem',
                maxWidth: '640px',
              }}
            >
              {[
                { icon: FileText, title: 'Documentos', desc: 'Envie, gerencie e acesse seus arquivos com facilidade.' },
                { icon: FolderOpen, title: 'Categorias', desc: 'Organização completa para sua rotina.' },
                { icon: Clock, title: 'Histórico', desc: 'Acompanhe tudo o que já foi feito.' },
                { icon: Shield, title: 'Segurança', desc: 'Seus dados protegidos com tecnologia de ponta.' },
              ].map((feature, i) => (
                <div key={i}>
                  <div
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      background:
                        'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.15) 100%)',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.75rem',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    <feature.icon size={20} color="#60a5fa" />
                  </div>
                  <h3
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'white',
                      margin: '0 0 0.25rem 0',
                    }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: '#94a3b8',
                      margin: 0,
                      lineHeight: '1.5',
                    }}
                  >
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.7rem',
              color: '#64748b',
              letterSpacing: '0.05em',
            }}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>SGI Docs</span>
              <span>•</span>
              <span>Continental</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span>MAIS CONTROLE</span>
              <span>•</span>
              <span>MAIS EFICIÊNCIA</span>
              <span>•</span>
              <span>MAIS RESULTADOS</span>
            </div>
          </div>
        </div>

        {/* Lado Direito - Formulário */}
        <div
          style={{
            width: '500px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              background: 'rgba(15, 30, 58, 0.75)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: '1.25rem',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              padding: '2.5rem',
              boxShadow:
                '0 24px 48px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '2rem',
              }}
            >
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
                }}
              >
                <FileText color="white" size={20} />
              </div>
              <div>
                <h1
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: 'white',
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  SGI <span style={{ color: '#3b82f6' }}>Docs</span>
                </h1>
                <p
                  style={{
                    fontSize: '0.65rem',
                    color: '#94a3b8',
                    margin: 0,
                  }}
                >
                  Gestão Inteligente de Documentos
                </p>
              </div>
            </div>

            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'white',
                margin: '0 0 0.5rem 0',
                letterSpacing: '-0.02em',
              }}
            >
              Bem-vindo de volta!
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#94a3b8',
                margin: '0 0 2rem 0',
              }}
            >
              Faça login para acessar o sistema.
            </p>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={inputWrapperStyle(emailFocused)}>
                  <User size={18} color={emailFocused ? '#60a5fa' : '#64748b'} />
                  <input
                    data-theme="dark"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    placeholder="Usuário ou e-mail"
                    autoComplete="email"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={inputWrapperStyle(passwordFocused)}>
                  <Lock size={18} color={passwordFocused ? '#60a5fa' : '#64748b'} />
                  <input
                    data-theme="dark"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    placeholder="Senha"
                    autoComplete="current-password"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      opacity: 0.7,
                    }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color="#94a3b8" />
                    ) : (
                      <Eye size={18} color="#94a3b8" />
                    )}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.25rem',
                  fontSize: '0.8rem',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{
                      width: '1rem',
                      height: '1rem',
                      accentColor: '#3b82f6',
                      cursor: 'pointer',
                    }}
                  />
                  <span style={{ color: '#e2e8f0' }}>Manter-me conectado</span>
                </label>
                <a
                  href="#"
                  style={{
                    color: '#60a5fa',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  Esqueceu sua senha?
                </a>
              </div>

              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#fca5a5',
                    borderRadius: '0.5rem',
                    fontSize: '0.8rem',
                    marginBottom: '1rem',
                  }}
                >
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: loading
                    ? '#1e40af'
                    : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  padding: '0.875rem',
                  borderRadius: '0.75rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: loading ? 'wait' : 'pointer',
                  boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
                  transition: 'all 0.2s',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                margin: '1.5rem 0',
              }}
            >
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(59, 130, 246, 0.15)' }} />
              <span style={{ fontSize: '0.7rem', color: '#64748b', letterSpacing: '0.05em' }}>
                OU
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(59, 130, 246, 0.15)' }} />
            </div>

            <button
              type="button"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                color: 'white',
                padding: '0.875rem',
                borderRadius: '0.75rem',
                fontWeight: 500,
                fontSize: '0.875rem',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                cursor: 'pointer',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
              Entrar com Microsoft
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '1.75rem',
                fontSize: '0.65rem',
                color: '#64748b',
                letterSpacing: '0.02em',
              }}
            >
              <Shield size={12} />
              Sistema seguro e em conformidade com a LGPD
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '2.5rem',
          right: '3rem',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'white', margin: 0 }}>
            Continental
          </p>
          <p
            style={{
              fontSize: '0.55rem',
              color: '#64748b',
              margin: 0,
              letterSpacing: '0.15em',
              fontWeight: 600,
            }}
          >
            HSEQ BRASIL
          </p>
        </div>
        <svg width="40" height="20" viewBox="0 0 40 20">
          <path d="M5 15 Q10 5, 15 15 T25 15 T35 15" stroke="white" strokeWidth="2" fill="none" />
        </svg>
      </div>
    </div>
  );
}
