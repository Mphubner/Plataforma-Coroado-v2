import * as React from "react";
import { Shield } from "lucide-react";
import { Layout } from "./components/Layout";
import { AuthView } from "./components/AuthView";
import { SchoolProvider } from "./contexts/SchoolContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  can,
  normalizeRoles,
  pathForRoute,
  roleLabel,
  routeById,
  routeForPath,
  type Capability,
  type RouteId,
  type UserProfile,
} from '@/src/lib/permissions';

const HomeView = React.lazy(() => import('./components/HomeView').then(module => ({ default: module.HomeView })));
const AdminView = React.lazy(() => import('./components/AdminView').then(module => ({ default: module.AdminView })));
const JornadaView = React.lazy(() => import('./components/JornadaView').then(module => ({ default: module.JornadaView })));
const PastorsView = React.lazy(() => import('./components/PastorsView').then(module => ({ default: module.PastorsView })));
const SocialView = React.lazy(() => import('./components/SocialView').then(module => ({ default: module.SocialView })));
const UnitsView = React.lazy(() => import('./components/UnitsView').then(module => ({ default: module.UnitsView })));
const SocialMediaView = React.lazy(() => import('./components/SocialMediaView').then(module => ({ default: module.SocialMediaView })));
const CellView = React.lazy(() => import('./components/CellsView').then(module => ({ default: module.CellView })));
const StoreView = React.lazy(() => import('./components/StoreView').then(module => ({ default: module.StoreView })));
const MinistriesView = React.lazy(() => import('./components/MinistriesView').then(module => ({ default: module.MinistriesView })));
const PastoralCareView = React.lazy(() => import('./components/PastoralCareView').then(module => ({ default: module.PastoralCareView })));
const FinanceView = React.lazy(() => import('./components/FinanceView').then(module => ({ default: module.FinanceView })));
const EventsView = React.lazy(() => import('./components/EventsView').then(module => ({ default: module.EventsView })));
const SchoolView = React.lazy(() => import('./components/SchoolView').then(module => ({ default: module.SchoolView })));
const MembersView = React.lazy(() => import('./components/MembersView').then(module => ({ default: module.MembersView })));

// =====================================================
// Re-export types and context hooks for backward compat
// =====================================================
export type {
  QuizQuestion, OpenQuestion, Quiz, Lesson, Module, Course,
  Note, ForumQuestion, Enrollment, AchievementBadge as Badge,
  CourseRecommendation, LearningTrack, Plan, Transaction,
  Coupon, AutomationRule,
} from './types';

export { useSchool } from './contexts/SchoolContext';
export { AdminJornadaTab } from './components/admin/AdminJornadaTab';
export { AdminSchoolTab } from './components/admin/AdminSchoolTab';

// =====================================================
// Auth Gate
// =====================================================

type AuthGateState = 'loading' | 'signedOut' | 'onboarding' | 'pending' | 'approved';

export default function App() {
  const [authState, setAuthState] = React.useState<AuthGateState>('loading');
  const [userData, setUserData] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refreshProfile = React.useCallback(async () => {
    const user = auth.currentUser;

    if (!user) {
      setUserData(null);
      setAuthState('signedOut');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        setUserData({
          id: user.uid,
          uid: user.uid,
          name: user.displayName || '',
          email: user.email || '',
          roles: ['member'],
          isApproved: false,
          tenantId: 'tenant-1',
        });
        setAuthState('onboarding');
        return;
      }

      const rawProfile = userDoc.data();
      const profile: UserProfile = {
        id: user.uid,
        uid: user.uid,
        ...rawProfile,
        roles: normalizeRoles(rawProfile.roles as string[] | undefined),
      };

      setUserData(profile);
      setAuthState(profile.isApproved ? 'approved' : 'pending');
    } catch (error) {
      console.error('Erro ao carregar perfil do usuario:', error);
      setUserData(null);
      setAuthState('signedOut');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');

    if (paymentStatus === 'success') {
      alert('Pagamento aprovado com sucesso! Seus itens estao sendo processados.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'failure') {
      alert('O pagamento nao foi aprovado. Tente novamente.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const unsub = auth.onAuthStateChanged(() => {
      refreshProfile();
    });

    return () => unsub();
  }, [refreshProfile]);

  if (loading || authState === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  // Ocultamos AuthView global apenas se estivermos "signedOut" ou "approved".
  // Se estiver "onboarding" ou "pending", forçamos a tela de Auth para finalizar cadastro.
  const isAuthLocked = authState === 'onboarding' || authState === 'pending';

  return (
    <BrowserRouter>
      <SchoolProvider>
        {isAuthLocked ? (
          <AuthView
            currentUserData={userData}
            initialState={authState === 'onboarding' ? 'onboarding' : 'pending'}
            onLoginComplete={refreshProfile}
          />
        ) : (
          <AppShell userData={userData} authState={authState} onLogout={() => signOut(auth)} refreshProfile={refreshProfile} />
        )}
      </SchoolProvider>
    </BrowserRouter>
  );
}

// =====================================================
// App Shell — Layout + Routes
// =====================================================

function AppShell({ userData, authState, onLogout, refreshProfile }: { userData: UserProfile | null; authState: AuthGateState; onLogout: () => Promise<void>; refreshProfile: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeRoute = routeForPath(location.pathname);

  const navigateToTab = React.useCallback(
    (routeId: string) => {
      navigate(pathForRoute(routeId as RouteId));
    },
    [navigate],
  );

  // Se o usuário acessar a rota /login diretamente
  if (location.pathname === '/login' && authState === 'signedOut') {
    return <AuthView currentUserData={userData} initialState="login" onLoginComplete={() => {
      refreshProfile();
      navigate('/');
    }} />;
  }

  return (
    <Layout
      activeTab={activeRoute.id}
      setActiveTab={navigateToTab}
      isLoggedIn={authState === 'approved'}
      userData={userData}
      userRole={roleLabel(userData)}
      onLoginClick={() => navigate('/login')}
      onLogoutClick={async () => {
        await onLogout();
        navigate('/');
      }}
    >
      <React.Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<HomeView onTabChange={navigateToTab} userData={userData} />} />
          <Route path="/gestao" element={<ProtectedPage user={userData} capability="view:admin"><AdminView userData={userData} /></ProtectedPage>} />
          <Route path="/jornada" element={<ProtectedPage user={userData} capability="view:jornada"><JornadaView /></ProtectedPage>} />
          <Route path="/pastores" element={<ProtectedPage user={userData} capability="view:public"><PastorsView isAdmin={can(userData, 'view:admin')} userData={userData} isLoggedIn={authState === 'approved'} onLoginClick={() => navigate('/login')} /></ProtectedPage>} />
          <Route path="/social" element={<ProtectedPage user={userData} capability="view:public"><SocialView isAdmin={can(userData, 'view:admin')} userData={userData} isLoggedIn={authState === 'approved'} onLoginClick={() => navigate('/login')} /></ProtectedPage>} />
          <Route path="/unidades" element={<ProtectedPage user={userData} capability="view:public"><UnitsView isAdmin={can(userData, 'view:admin')} userData={userData} /></ProtectedPage>} />
          <Route path="/midia" element={<ProtectedPage user={userData} capability="view:public"><SocialMediaView /></ProtectedPage>} />
          <Route path="/loja" element={<ProtectedPage user={userData} capability="view:public"><StoreView isAdmin={can(userData, 'manage:finance')} userData={userData} /></ProtectedPage>} />
          <Route path="/ministerios" element={<ProtectedPage user={userData} capability="view:public"><MinistriesView isLoggedIn={authState === 'approved'} userData={userData} onLoginClick={() => navigate('/login')} /></ProtectedPage>} />
          <Route path="/cuidado-pastoral" element={<ProtectedPage user={userData} capability="view:pastoral"><PastoralCareView isLoggedIn userData={userData} /></ProtectedPage>} />
          <Route path="/financeiro" element={<ProtectedPage user={userData} capability="view:finance"><FinanceView userData={userData} /></ProtectedPage>} />
          <Route path="/eventos" element={<ProtectedPage user={userData} capability="view:public"><EventsView isLoggedIn={authState === 'approved'} userData={userData} onLoginClick={() => navigate('/login')} /></ProtectedPage>} />
          <Route path="/escola" element={<ProtectedPage user={userData} capability="view:school"><SchoolView userRole={normalizeRoles(userData?.roles)} /></ProtectedPage>} />
          <Route path="/membros" element={<ProtectedPage user={userData} capability="view:members"><MembersView userData={userData} /></ProtectedPage>} />
          <Route
            path="/celulas"
            element={
              <ProtectedPage user={userData} capability="view:public">
                <CellView
                  isLoggedIn={authState === 'approved'}
                  isLeader={can(userData, 'manage:cell')}
                  onTabChange={navigateToTab}
                  userData={userData}
                />
              </ProtectedPage>
            }
          />
          <Route path="*" element={<Navigate to={pathForRoute(routeById.home.id)} replace />} />
        </Routes>
      </React.Suspense>
    </Layout>
  );
}

// =====================================================
// Route Protection
// =====================================================

function ProtectedPage({
  user,
  capability,
  children,
}: {
  user: UserProfile | null;
  capability: Capability;
  children: React.ReactNode;
}) {
  if (!can(user, capability)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-white/10 bg-white/[0.03] text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-300">
              <Shield className="h-6 w-6" />
            </div>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>
              Esta area depende de permissao da lideranca. Se voce acredita que deveria acessar, solicite revisao do seu perfil.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.assign('/')}>
              Voltar ao inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

function RouteLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white/70">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
        Carregando area...
      </div>
    </div>
  );
}
