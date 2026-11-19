import React, { useState, useEffect } from 'react';
import { Navbar } from './components/common/Navbar.js';
import { HomePage } from './pages/HomePage.js';
import { LobbyView } from './components/lobby/LobbyView.js';
import { GameView } from './components/game/GameView.js';
import { ResultsView } from './components/results/ResultsView.js';
import { PracticePage } from './pages/PracticePage.js';
import { useGame } from './context/GameContext.js';
import { WifiOff } from 'lucide-react';

export const App: React.FC = () => {
  const { room, gameState, isConnected } = useGame();
  const [isPractice, setIsPractice] = useState(false);

  // Dark/Light theme state persisted via localStorage
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('doodledash_theme');
    return saved ? saved === 'dark' : false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('doodledash_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('doodledash_theme', 'light');
    }
  }, [darkMode]);

  const isInGame = Boolean(room && gameState && gameState.phase !== 'LOBBY' && gameState.phase !== 'GAME_OVER');

  return (
    <div className={`w-full ${isInGame ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-screen'} flex flex-col ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#F5F7FA] text-slate-900'} transition-colors duration-200`}>
      {/* Top Navigation */}
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onGoHome={() => setIsPractice(false)}
      />

      {/* Connection warning banner */}
      {!isConnected && (
        <div className="bg-amber-600/90 text-white text-xs font-bold py-1 px-4 text-center flex items-center justify-center gap-2 shrink-0">
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>Connecting to multiplayer server...</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 ${isInGame ? 'min-h-0 overflow-hidden' : 'overflow-x-hidden'}`}>
        {isPractice ? (
          <PracticePage onBack={() => setIsPractice(false)} />
        ) : !room ? (
          <HomePage onStartPractice={() => setIsPractice(true)} />
        ) : gameState?.phase === 'LOBBY' ? (
          <LobbyView />
        ) : gameState?.phase === 'GAME_OVER' ? (
          <ResultsView />
        ) : (
          <GameView />
        )}
      </main>
    </div>
  );
};
