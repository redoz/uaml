import { AuthProvider, useAuth } from "./lib/auth";
import { LoginGate } from "./components/LoginGate";
import { CanvasApp } from "./components/canvas/Canvas";
function Shell() { const { me, ready } = useAuth(); if (!ready) return null; return me ? <CanvasApp /> : <LoginGate />; }
export function App() { return <AuthProvider><Shell /></AuthProvider>; }
