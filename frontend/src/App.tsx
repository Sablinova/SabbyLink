function App() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '2rem',
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔗 SabbyLink</h1>
      <p style={{ fontSize: '1.25rem', opacity: 0.8, textAlign: 'center', maxWidth: '600px' }}>
        Advanced Discord Selfbot with AI Integration
      </p>
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        backgroundColor: '#1e293b',
        borderRadius: '0.5rem',
        maxWidth: '500px',
        width: '100%',
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Coming Soon</h2>
        <ul style={{ listStyle: 'none', padding: 0, opacity: 0.9 }}>
          <li style={{ padding: '0.5rem 0' }}>✅ Project planning complete</li>
          <li style={{ padding: '0.5rem 0' }}>✅ Backend foundation ready</li>
          <li style={{ padding: '0.5rem 0' }}>✅ Database schema defined</li>
          <li style={{ padding: '0.5rem 0' }}>🚧 Discord bot integration</li>
          <li style={{ padding: '0.5rem 0' }}>🚧 Web dashboard UI</li>
          <li style={{ padding: '0.5rem 0' }}>🚧 AI provider adapters</li>
          <li style={{ padding: '0.5rem 0' }}>🚧 RPC system</li>
        </ul>
      </div>
      <p style={{ marginTop: '2rem', opacity: 0.6, fontSize: '0.875rem' }}>
        Version 0.1.0 (Pre-release) • GPL-3.0 License
      </p>
    </div>
  );
}

export default App;
