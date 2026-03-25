import { useState } from "react";
import { Sidebar } from "./components/Layout/Sidebar";
import { NodeView } from "./components/NodeView/NodeView";

function SingleNodeLayout() {
  const [rootId, setRootId] = useState<string | null>(null);
  return (
    <div style={{ display: "flex", flex: 1 }}>
      <Sidebar activeId={rootId} onSelectId={setRootId} />
      {rootId && <NodeView rootId={rootId} />}
    </div>
  );
}

function App() {
  // usePersistence();
  // useUndoRedo();
  return <SingleNodeLayout />;
}

export default App;
