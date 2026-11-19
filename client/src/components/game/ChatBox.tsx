import React, { useState, useRef, useEffect } from 'react';
import { Send, Flame, MessageSquare, AlertCircle } from 'lucide-react';
import { useGame } from '../../context/GameContext.js';
import { sounds } from '../../audio/SoundEngine.js';

export const ChatBox: React.FC = () => {
  const { chatMessages, sendChatMessage, isDrawer, gameState, profile, closeGuessAlert } = useGame();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const myPlayer = gameState?.guessedPlayerIds.includes(profile.id);
  const isDrawing = gameState?.phase === 'DRAWING';

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, closeGuessAlert]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sounds.playPop();
    sendChatMessage(inputText);
    setInputText('');
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-md flex flex-col h-full max-h-[640px]">
      <div className="flex items-center gap-2 pb-3 mb-2 border-b border-slate-800">
        <MessageSquare className="w-4 h-4 text-brand-400" />
        <h3 className="font-extrabold text-white text-sm">Live Chat & Guesses</h3>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3 text-xs">
        {chatMessages.length === 0 ? (
          <p className="text-slate-500 text-center py-10 italic">Type your guesses here!</p>
        ) : (
          chatMessages.map((msg) => {
            if (msg.type === 'correct') {
              return (
                <div
                  key={msg.id}
                  className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-2 shadow-sm animate-in fade-in"
                >
                  <span>🎉</span>
                  <span>{msg.text}</span>
                </div>
              );
            }

            if (msg.type === 'drawer' || msg.type === 'system') {
              return (
                <div key={msg.id} className="text-slate-400 italic py-0.5 flex items-center gap-1.5">
                  <span className="text-brand-400 font-semibold">ℹ️</span>
                  <span>{msg.text}</span>
                </div>
              );
            }

            return (
              <div key={msg.id} className="py-0.5 break-words">
                <span className="font-bold mr-1.5" style={{ color: msg.senderColor || '#818cf8' }}>
                  {msg.senderName}:
                </span>
                <span className={msg.type === 'guess' ? 'text-slate-100 font-medium' : 'text-slate-300'}>
                  {msg.text}
                </span>
              </div>
            );
          })
        )}

        {/* Close guess notification pill */}
        {closeGuessAlert && (
          <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold flex items-center gap-2 animate-bounce">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>You are so close! Keep guessing!</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Guess Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 relative">
        <input
          type="text"
          maxLength={100}
          disabled={isDrawer && isDrawing}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isDrawer && isDrawing
              ? 'You are drawing! Chat disabled.'
              : myPlayer && isDrawing
              ? 'You guessed correctly! Chat with others...'
              : 'Type your guess here...'
          }
          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:bg-slate-900"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || (isDrawer && isDrawing)}
          className="px-3.5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold transition-all active:scale-95 flex items-center justify-center shadow"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
