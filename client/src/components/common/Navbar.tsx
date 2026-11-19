import React, { useState } from 'react';
import { Volume2, VolumeX, Moon, Sun, Maximize2, Minimize2, Copy, Check, Palette } from 'lucide-react';
import { useGame } from '../../context/GameContext.js';
import { sounds } from '../../audio/SoundEngine.js';

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  onGoHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ darkMode, setDarkMode, onGoHome }) => {
  const { room, leaveRoom, gameState } = useGame();
  const [isMuted, setIsMuted] = useState(sounds.getMuted());
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isInGame = Boolean(room && gameState && gameState.phase !== 'LOBBY' && gameState.phase !== 'GAME_OVER');

  const toggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const copyRoomLink = () => {
    if (!room) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${room.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      sounds.playPop();
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLogoClick = () => {
    if (room) {
      leaveRoom();
    }
    if (onGoHome) {
      onGoHome();
    }
  };

  return (
    <header className={`w-full bg-white dark:bg-slate-900 border-b-2 border-blue-500 dark:border-blue-600/70 sticky top-0 z-40 shadow-sm transition-colors ${
      isInGame ? 'h-10 sm:h-12' : 'h-12 sm:h-14'
    }`}>
      <div className="max-w-7xl mx-auto px-2 sm:px-6 h-full flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Brand / Logo */}
        <div
          onClick={handleLogoClick}
          className="flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none shrink-0"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-md">
            <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <span className="text-base sm:text-lg font-extrabold tracking-tight text-blue-600 dark:text-blue-400 font-game">
            Doodle<span className="text-gray-800 dark:text-white">Dash</span>
          </span>
        </div>

        {/* Room Code Badge */}
        {room && (
          <div className="flex items-center gap-1 sm:gap-1.5 bg-blue-50 dark:bg-slate-800 border sm:border-2 border-blue-400 dark:border-blue-500/50 rounded-md sm:rounded-lg px-1.5 sm:px-2.5 py-0.5 sm:py-1">
            <span className="text-[10px] sm:text-xs font-medium text-blue-600 dark:text-blue-300 uppercase tracking-wider hidden sm:inline">Room:</span>
            <span className="font-mono font-bold text-blue-700 dark:text-blue-300 tracking-wider text-xs sm:text-sm">{room.id}</span>
            <button
              type="button"
              onClick={copyRoomLink}
              title="Copy invite link"
              className="ml-0.5 sm:ml-1 p-0.5 sm:p-1 rounded bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-300 transition-colors flex items-center gap-0.5 text-[10px] sm:text-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400 hidden md:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span className="hidden md:inline">Invite</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleSound}
            title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            className="p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-colors"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" />}
          </button>

          <button
            type="button"
            onClick={() => setDarkMode(prev => !prev)}
            title={darkMode ? 'Light mode' : 'Dark mode'}
            className="p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-colors"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title="Toggle fullscreen"
            className="p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-colors hidden sm:block"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {room && (
            <button
              type="button"
              onClick={leaveRoom}
              className="text-[11px] sm:text-xs font-bold px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg bg-red-50 dark:bg-red-950/60 hover:bg-red-500 hover:text-white text-red-500 dark:text-red-400 border border-red-300 dark:border-red-600/50 transition-colors ml-0.5"
            >
              Leave
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
