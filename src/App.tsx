import { usePersistence } from './hooks/usePersistence';
import { Layout } from './components/Layout/Layout';

function App() {
  usePersistence();
  return <Layout />;
}

export default App;
