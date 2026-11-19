import React, { useState, useEffect } from 'react';
import { 
  Play, 
  PlusCircle, 
  KeyRound, 
  HelpCircle, 
  Sparkles, 
  Paintbrush, 
  Smartphone, 
  Zap, 
  Trophy,
  Users
} from 'lucide-react';
import { ProfileCard } from '../components/landing/ProfileCard.js';
import { JoinModal } from '../components/landing/JoinModal.js';
import { HowToPlayModal } from '../components/landing/HowToPlayModal.js';
import { useGame } from '../context/GameContext.js';
import { sounds } from '../audio/SoundEngine.js';

interface HomePageProps {
  onStartPractice: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onStartPractice }) => {
  const { createRoom, joinRoom } = useGame();
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Auto-detect room parameter from URL: e.g. ?room=ABCDEF
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      joinRoom(roomParam.toUpperCase().trim());
    }
  }, [joinRoom]);

  const handleCreateRoom = async () => {
    sounds.playPop();
    setCreating(true);
    await createRoom();
    setCreating(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 animate-in fade-in select-none">
      {/* Hero Section */}
      <div className="text-center mb-10 sm:mb-12 relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs sm:text-sm font-bold mb-4 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-brand-400" />
          <span>The Next-Gen Realtime Drawing & Guessing Experience</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4">
          Draw. Guess.{' '}
          <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-accent-pink bg-clip-text text-transparent">
            Dominate.
          </span>
        </h1>

        <p className="text-slate-300 text-sm sm:text-lg max-w-2xl mx-auto font-normal">
          Jump into high-energy private lobbies with your friends. Silky smooth HTML5 canvas, dynamic hints, authoritative scoring, and dedicated mobile controls.
        </p>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
        {/* Profile Customizer (5 cols) */}
        <div className="lg:col-span-5 w-full">
          <ProfileCard />
        </div>

        {/* Action Buttons (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Create Private Room Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-brand-900/60 via-slate-800 to-slate-800/90 border border-brand-500/40 shadow-xl backdrop-blur-md relative overflow-hidden group">
            <div className="relative z-10">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-400 mb-1 block">
                Instant Multiplayer
              </span>
              <h3 className="text-2xl font-black text-white mb-2">Create Private Room</h3>
              <p className="text-sm text-slate-300 mb-5 max-w-md">
                Generate a custom 6-digit room code with a shareable invitation link. Customize rounds, time limits, and word categories.
              </p>

              <button
                onClick={handleCreateRoom}
                disabled={creating}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-accent-pink hover:from-brand-500 hover:to-accent-pink/90 text-white font-extrabold text-base shadow-xl shadow-brand-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 group-hover:shadow-brand-500/40"
              >
                {creating ? (
                  <span className="inline-block animate-spin mr-2">⚪</span>
                ) : (
                  <>
                    <PlusCircle className="w-5 h-5" />
                    <span>Create Private Room</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Join Room & Solo Practice Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Join Room */}
            <div className="p-5 rounded-3xl bg-slate-800/70 border border-slate-700/80 shadow-lg backdrop-blur-md flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-accent-green/20 border border-accent-green/30 flex items-center justify-center text-accent-green mb-3">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white mb-1">Join with Code</h4>
                <p className="text-xs text-slate-300 mb-4">
                  Have a friend's room code? Jump right into their lobby.
                </p>
              </div>

              <button
                onClick={() => {
                  sounds.playPop();
                  setJoinModalOpen(true);
                }}
                className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Enter Room Code</span>
              </button>
            </div>

            {/* Solo Practice */}
            <div className="p-5 rounded-3xl bg-slate-800/70 border border-slate-700/80 shadow-lg backdrop-blur-md flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                  <Paintbrush className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-white mb-1">Solo Practice Mode</h4>
                <p className="text-xs text-slate-300 mb-4">
                  Hone your drawing skills against the clock with random prompts.
                </p>
              </div>

              <button
                onClick={() => {
                  sounds.playPop();
                  onStartPractice();
                }}
                className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Practice Drawing</span>
              </button>
            </div>
          </div>

          {/* How to Play pill button */}
          <div className="text-center pt-2">
            <button
              onClick={() => {
                sounds.playPop();
                setHowToPlayOpen(true);
              }}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-brand-400" />
              <span>New to DoodleDash? Read the Game Rules & Scoring</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center mb-3">
            <Zap className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm mb-1">Sub-Millisecond Drawing</h4>
          <p className="text-xs text-slate-400">
            Delta stroke streaming over Socket.IO keeps drawings synchronized in real time.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="w-9 h-9 rounded-xl bg-accent-green/20 text-accent-green flex items-center justify-center mb-3">
            <Smartphone className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm mb-1">Mobile & Tablet Native</h4>
          <p className="text-xs text-slate-400">
            Dedicated mobile layout prevents unwanted scrolling, zoom hijacking, and layout clipping.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
            <Trophy className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm mb-1">Authoritative Scoring</h4>
          <p className="text-xs text-slate-400">
            Server-verified time decay, guess rank bonuses, and drawer rewards for fair competition.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="w-9 h-9 rounded-xl bg-accent-pink/20 text-accent-pink flex items-center justify-center mb-3">
            <Users className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm mb-1">Instant Rematch</h4>
          <p className="text-xs text-slate-400">
            Keep your friend group together without recreating rooms or redistributing links.
          </p>
        </div>
      </div>

      {/* Modals */}
      <JoinModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
      />

      <HowToPlayModal
        isOpen={howToPlayOpen}
        onClose={() => setHowToPlayOpen(false)}
      />
    </div>
  );
};
