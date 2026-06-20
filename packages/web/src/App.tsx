import { AuthProvider, useAuth } from "./lib/auth";
import { CanvasApp } from "./components/canvas/Canvas";

function Shell() {
  const { ready } = useAuth();
  if (!ready) return null;
  return <CanvasApp />;
}

export function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
