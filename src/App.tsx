import { Sidebar } from "./components/Layout/Sidebar";
import { NodeView } from "./components/NodeView/NodeView";

function App() {
  // usePersistence();
  // useUndoRedo();
  return (
    <div>
      <Sidebar />
      <NodeView />
    </div>
  );
}

export default App;
