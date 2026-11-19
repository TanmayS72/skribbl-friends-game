import React, { useState, useRef, useEffect } from 'react';
import { Send, Flame } from 'lucide-react';
import { useGame } from '../../context/GameContext.js';
import { sounds } from '../../audio/SoundEngine.js';

export const ChatBox: React.FC = () => {
  const { chatMessages, sendChatMessage, isDrawer, gameState, profile, closeGuessAlert } = useGame();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const myPlayer = gameState?.guessedPlayerIds.includes(profile.id);
  const isDrawing = gameState?.phase === 'DRAWING';

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
    <div className="w-full bg-white dark:bg-slate-900 border-2 border-blue-400 dark:border-blue-600/60 flex flex-col h-full overflow-hidden shadow-xs">
      {/* Header */}
      <div className="bg-blue-500 px-2.5 py-1 sm:py-1.5 shrink-0">
        <h3 className="font-extrabold text-white text-[11px] sm:text-xs uppercase tracking-wider">Chat & Guesses</h3>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 text-xs">
        {chatMessages.length === 0 ? (
          <p className="text-gray-400 dark:text-slate-500 text-center py-4 italic text-[11px]">Type your guesses here!</p>
        ) : (
          chatMessages.map((msg) => {
            if (msg.type === 'correct') {
              return (
                <div
                  key={msg.id}
                  className="p-1 rounded-md bg-green-100 dark:bg-emerald-950/60 border border-green-300 dark:border-emerald-600/40 text-green-800 dark:text-emerald-300 font-bold flex items-center gap-1.5 text-[11px] animate-correct-flash"
                >
                  <span>🎉</span>
                  <span className="truncate">{msg.text}</span>
                </div>
              );
            }

            if (msg.type === 'drawer' || msg.type === 'system') {
              return (
                <div key={msg.id} className="text-gray-500 dark:text-slate-400 italic py-0.5 flex items-center gap-1 text-[10px]">
                  <span className="text-blue-500 dark:text-blue-400">ℹ️</span>
                  <span>{msg.text}</span>
                </div>
              );
            }

            return (
              <div key={msg.id} className="py-0.5 break-words text-[11px]">
                <span className="font-bold mr-1" style={{ color: msg.senderColor || '#3B82F6' }}>
                  {msg.senderName}:
                </span>
                <span className={msg.type === 'guess' ? 'text-gray-800 dark:text-slate-200 font-medium' : 'text-gray-600 dark:text-slate-400'}>
                  {msg.text}
                </span>
              </div>
            );
          })
        )}

        {closeGuessAlert && (
          <div className="p-1 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-600/40 text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1 text-[11px] animate-bounce">
            <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>So close! Keep guessing!</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Guess Input */}
      <form onSubmit={handleSubmit} className="shrink-0 flex gap-1 p-1.5 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/90">
        <input
          type="text"
          maxLength={100}
          disabled={isDrawer && isDrawing}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isDrawer && isDrawing
              ? 'You are drawing!'
              : myPlayer && isDrawing
              ? 'Guessed! Chat away...'
              : 'Type your guess...'
          }
          className="flex-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-slate-800"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || (isDrawer && isDrawing)}
          className="px-2.5 py-1.5 rounded-md bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:pointer-events-none text-white font-bold transition-colors flex items-center justify-center shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
