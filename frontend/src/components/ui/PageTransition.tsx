import { useLocation } from 'react-router-dom';
import './PageTransition.css';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div key={pathname} className="page-transition-enter flex-1 flex flex-col">
      {children}
    </div>
  );
}
