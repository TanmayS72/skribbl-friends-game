import React, { useState } from 'react';
import { Volume2, VolumeX, Moon, Sun, Maximize2, Minimize2, Share2, Copy, Check, Palette } from 'lucide-react';
import { useGame } from '../../context/GameContext.js';
import { sounds } from '../../audio/SoundEngine.js';

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  onGoHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ darkMode, setDarkMode, onGoHome }) => {
  const { room, leaveRoom } = useGame();
  const [isMuted, setIsMuted] = useState(sounds.getMuted());
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  return (
    <header className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div 
          onClick={onGoHome || leaveRoom}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-accent-pink flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform">
            <Palette className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-brand-400 via-indigo-300 to-accent-pink bg-clip-text text-transparent">
              Doodle<span className="text-white">Dash</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
              Live Multiplayer
            </span>
          </div>
        </div>

        {/* Room Code Badge (if inside a room) */}
        {room && (
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-inner">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider hidden sm:inline">Room:</span>
            <span className="font-mono font-bold text-brand-300 tracking-widest text-sm sm:text-base">{room.id}</span>
            <button
              onClick={copyRoomLink}
              title="Copy room invite link"
              className="ml-1 p-1 rounded-lg bg-slate-700/60 hover:bg-brand-600 text-slate-300 hover:text-white transition-all flex items-center gap-1 text-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 hidden md:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Invite</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={isMuted ? "Unmute sounds" : "Mute sounds"}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 transition-all hover:scale-105 active:scale-95"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(prev => !prev)}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 transition-all hover:scale-105 active:scale-95"
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title="Toggle fullscreen"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 transition-all hover:scale-105 active:scale-95 hidden sm:block"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          {/* Leave Room Button */}
          {room && (
            <button
              onClick={leaveRoom}
              className="text-xs font-semibold px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 transition-all active:scale-95 ml-1"
            >
              Leave
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
