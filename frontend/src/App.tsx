import { BrowserRouter } from 'react-router-dom';
import TopBar from './components/layout/TopBar';
import BottomNav from './components/layout/BottomNav';
import AppRouter from './router';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-slate-50">
        <TopBar />
        <main className="flex-1 flex flex-col">
          <AppRouter />
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
