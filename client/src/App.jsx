import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Releases from './pages/Releases';
import ReleaseEditor from './pages/ReleaseEditor';
import ReleaseDetails from './pages/ReleaseDetails';
import AIAnalysis from './pages/AIAnalysis';
import ReviewWorkspace from './pages/ReviewWorkspace';
import VersionHistory from './pages/VersionHistory';
import VersionsOverview from './pages/VersionsOverview';
import VersionComparison from './pages/VersionComparison';
import FinalBrief from './pages/FinalBrief';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="releases" element={<Releases />} />
        <Route path="releases/new" element={<ReleaseEditor mode="new" />} />
        <Route path="releases/:id" element={<ReleaseDetails />} />
        <Route path="releases/:id/versions" element={<VersionHistory />} />
        <Route path="releases/:id/versions/new" element={<ReleaseEditor mode="version" />} />
        <Route path="releases/:id/compare" element={<VersionComparison />} />
        <Route path="versions" element={<VersionsOverview />} />
        <Route path="versions/:id/edit" element={<ReleaseEditor mode="edit" />} />
        <Route path="versions/:id/analysis" element={<AIAnalysis />} />
        <Route path="versions/:id/review" element={<ReviewWorkspace />} />
        <Route path="versions/:id/brief" element={<FinalBrief />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
