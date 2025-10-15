export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>RayZ Backend API</h1>
      <p>Backend API server is running.</p>
      <p>API endpoints:</p>
      <ul>
        <li>/api/health - Health check</li>
        <li>/api/targets - Target management</li>
        <li>/api/weapons - Weapon management</li>
      </ul>
    </main>
  );
}
