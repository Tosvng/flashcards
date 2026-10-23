import { Navigate, Outlet, Route, Routes } from 'react-router';
import { useAuth } from '../application/auth/AuthProvider';
import { LoadingView } from '../presentation/components/StateViews';
import { AddCardScreen } from '../presentation/screens/AddCardScreen';
import { EditCardScreen } from '../presentation/screens/EditCardScreen';
import { LoginScreen } from '../presentation/screens/LoginScreen';
import { MyWordsScreen } from '../presentation/screens/MyWordsScreen';
import { RegisterScreen } from '../presentation/screens/RegisterScreen';
import { ReviewScreen } from '../presentation/screens/ReviewScreen';
import { SessionCompleteScreen } from '../presentation/screens/SessionCompleteScreen';
import { TodayScreen } from '../presentation/screens/TodayScreen';

/** Signed-in screens. Signing out (or a rejected token) sends the user to /login automatically. */
function RequireAuth() {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingView />;
  return status === 'signedIn' ? <Outlet /> : <Navigate to="/login" replace />;
}

/** Login / register: signed-in users go straight to Today. */
function PublicOnly() {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingView />;
  return status === 'signedIn' ? <Navigate to="/" replace /> : <Outlet />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route path="/" element={<TodayScreen />} />
        <Route path="/review" element={<ReviewScreen />} />
        <Route path="/done" element={<SessionCompleteScreen />} />
        <Route path="/add" element={<AddCardScreen />} />
        <Route path="/words" element={<MyWordsScreen />} />
        <Route path="/words/:id" element={<EditCardScreen />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
