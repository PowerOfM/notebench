import { usePersistence } from './hooks/usePersistence';
import { useUndoRedo } from './hooks/useUndoRedo';
import { Layout } from './components/Layout/Layout';

function App() {
  usePersistence();
  useUndoRedo();
  return <Layout />;
}

export default App;
