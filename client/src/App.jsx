import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth, RedirectIfAuthed } from './components/RouteGuards.jsx';
import AppShell from './components/AppShell.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Home from './pages/Home.jsx';
import Discover from './pages/Discover.jsx';
import Requests from './pages/Requests.jsx';
import Profile from './pages/Profile.jsx';
import PublicProfile from './pages/PublicProfile.jsx';
import GroupPage from './pages/GroupPage.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<RedirectIfAuthed><Landing /></RedirectIfAuthed>} />
      <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
      <Route path="/signup" element={<RedirectIfAuthed><Signup /></RedirectIfAuthed>} />

      {/* The app: rail, socket and chat store are shared across all of these. */}
      <Route element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route path="/home" element={<Home />} />
        <Route path="/home/:conversationId" element={<Home />} />
        <Route path="/search" element={<Discover />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/user/:username" element={<PublicProfile />} />
        <Route path="/groups/:groupId" element={<GroupPage />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
