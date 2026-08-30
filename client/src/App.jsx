import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth, RedirectIfAuthed } from './components/RouteGuards.jsx';
import AppShell from './components/AppShell.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Home from './pages/Home.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RedirectIfAuthed><Landing /></RedirectIfAuthed>} />
      <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
      <Route path="/signup" element={<RedirectIfAuthed><Signup /></RedirectIfAuthed>} />

      <Route element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route path="/home" element={<Home />} />
        <Route path="/home/:conversationId" element={<Home />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
