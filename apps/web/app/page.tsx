'use client';

import { useEffect, useState } from 'react';

export default function LandingPage() {
  const [status, setStatus] = useState<'loading' | 'online' | 'offline'>('loading');
  
  // This will use the URL you set in Vercel, or fallback to local dev
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${apiUrl}/health`, {
          method: 'GET',
          mode: 'cors',
        });
        
        if (response.ok) {
          setStatus('online');
        } else {
          setStatus('offline');
        }
      } catch (error) {
        console.error('Health check failed:', error);
        setStatus('offline');
      }
    };

    checkHealth();
  }, [apiUrl]);

  return (
    <main style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Project O-Bit</h1>
        <p style={styles.subtitle}>Agency Blueprint Deployment</p>
        
        <div style={styles.statusBox}>
          <span style={styles.label}>Backend Status:</span>
          {status === 'loading' && <span style={styles.loading}>⏳ Checking...</span>}
          {status === 'online' && <span style={styles.online}>🟢 Online</span>}
          {status === 'offline' && <span style={styles.offline}>❌ Offline</span>}
        </div>

        <div style={styles.info}>
          <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
          <p><strong>Endpoint:</strong> <code style={styles.code}>{apiUrl}</code></p>
        </div>
      </div>
    </main>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f4f9',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    padding: '2rem',
    borderRadius: '12px',
    backgroundColor: '#fff',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    textAlign: 'center' as const,
    width: '100%',
    maxWidth: '400px',
  },
  title: { margin: 0, fontSize: '24px', color: '#333' },
  subtitle: { margin: '8px 0 24px', color: '#666', fontSize: '14px' },
  statusBox: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    padding: '15px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  label: { fontWeight: 'bold' as const, color: '#444' },
  online: { color: '#2e7d32', fontWeight: 'bold' as const },
  offline: { color: '#d32f2f', fontWeight: 'bold' as const },
  loading: { color: '#ffa000' },
  info: { textAlign: 'left' as const, fontSize: '12px', color: '#888' },
  code: { backgroundColor: '#eee', padding: '2px 4px', borderRadius: '4px' },
};