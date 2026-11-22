import type { ReactElement } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { FileTextOutlined, IdcardOutlined } from '@ant-design/icons';
import { AppLayout, AppNavMenu } from '@helex/ui';
import { AnimalList } from './pages/AnimalList';
import { AnimalCreate } from './pages/AnimalCreate';
import { AnimalDetail } from './pages/AnimalDetail';
import { ComplaintList } from './pages/ComplaintList';
import { ComplaintCreate } from './pages/ComplaintCreate';
import { ComplaintDetail } from './pages/ComplaintDetail';

/**
 * Components that may be ABSENT from this checkout register their routes by
 * exporting `routes: ReactElement[]` (a list of <Route>s) from
 * `pages/<component>/routes.tsx`. The glob is resolved at build time and is
 * simply empty when no such folder exists — the lecturer's private library
 * module lives there, gitignored. Students: add your <Route>s below, like animals.
 */
const componentRoutes = Object.values(
  import.meta.glob<{ routes: ReactElement[] }>('./pages/*/routes.tsx', { eager: true }),
).flatMap((m) => m.routes);

/**
 * The registers this app holds — one entry per component, in the top navigation.
 * Complaints (this group's component) comes first and is where the app opens;
 * Animals stays beside it as the course's worked example, for comparison.
 */
const REGISTERS = [
  { key: '/complaints', icon: <FileTextOutlined />, label: 'Complaints' },
  { key: '/animals', icon: <IdcardOutlined />, label: 'Animals' },
];

/**
 * Navigation between the registers, on @helex/ui's AppNavMenu (the module-level
 * nav list; AppHeader is the full EMR shell header and needs a platform this
 * template does not have). It lives here, around the routes, so main.tsx stays
 * untouched. The active entry follows the first path segment, so a record page
 * (/complaints/1006) keeps "Complaints" highlighted.
 */
const RegisterNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = REGISTERS.find((r) => pathname === r.key || pathname.startsWith(`${r.key}/`))?.key;
  return (
    <AppNavMenu
      mode="horizontal"
      selectedKeys={active ? [active] : []}
      onClick={({ key }) => navigate(String(key))}
      items={REGISTERS}
    />
  );
};

export const App = () => (
  <AppLayout>
    <RegisterNav />
    <AppLayout.Content>
      <Routes>
        <Route path="/" element={<Navigate to="/complaints" replace />} />
        <Route path="/animals" element={<AnimalList />} />
        <Route path="/animals/new" element={<AnimalCreate />} />
        <Route path="/animals/:id" element={<AnimalDetail />} />
        <Route path="/complaints" element={<ComplaintList />} />
        <Route path="/complaints/new" element={<ComplaintCreate />} />
        <Route path="/complaints/:id" element={<ComplaintDetail />} />
        {componentRoutes}
      </Routes>
    </AppLayout.Content>
  </AppLayout>
);
