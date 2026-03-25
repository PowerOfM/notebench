import { useAtomValue } from "jotai";
import { activeParentIdAtom } from "./store/atoms";
import { usePersistence } from "./hooks/usePersistence";
import { Sidebar } from "./components/Layout/Sidebar";
import { NodeView } from "./components/NodeView/NodeView";

function App() {
  usePersistence();
  const activeParentId = useAtomValue(activeParentIdAtom);
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      {activeParentId ? (
        <NodeView rootId={activeParentId} />
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p>Select or create a project in the sidebar</p>
        </div>
      )}
    </div>
  );
}

export default App;
