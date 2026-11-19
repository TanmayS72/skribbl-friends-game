import React, { useState } from 'react';
import { Crown, CheckCircle2, Circle, Settings, Play, Copy, Check, Users, UserX, MessageSquare } from 'lucide-react';
import { useGame } from '../../context/GameContext.js';
import { GameSettingsModal } from './GameSettingsModal.js';
import { sounds } from '../../audio/SoundEngine.js';

export const LobbyView: React.FC = () => {
  const { room, profile, isHost, startGame, toggleReady, kickPlayer, sendChatMessage, chatMessages } = useGame();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lobbyChat, setLobbyChat] = useState('');

  if (!room) return null;

  const players = Object.values(room.players);
  const connectedPlayers = players.filter(p => p.isConnected);
  const myPlayer = room.players[profile.id];
  const isReady = myPlayer?.isReady;

  const copyInvite = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${room.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      sounds.playPop();
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lobbyChat.trim()) return;
    sendChatMessage(lobbyChat);
    setLobbyChat('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in">
      {/* Top Banner: Room Code & Share Link */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-950/40 to-slate-900 border border-slate-700/80 rounded-3xl p-6 mb-8 shadow-2xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-400 mb-1 block">
            Private Game Room
          </span>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-white">
              {room.id}
            </h1>
            <button
              onClick={copyInvite}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-brand-600 text-slate-300 hover:text-white border border-slate-700 transition-all active:scale-95 flex items-center gap-2 text-sm font-semibold shadow"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Invite Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Settings Snapshot */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 font-medium">
            🎯 {room.settings.rounds} Rounds
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 font-medium">
            ⏱️ {room.settings.drawTime}s Draw Time
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 font-medium capitalize">
            🔥 {room.settings.difficulty} Difficulty
          </span>
          {isHost && (
            <button
              onClick={() => {
                sounds.playPop();
                setSettingsOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-brand-600/30 hover:bg-brand-600 border border-brand-500/50 text-brand-300 hover:text-white transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            >
              <Settings className="w-4 h-4" />
              <span>Configure</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Players Grid (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-400" />
              <span>Players in Lobby</span>
              <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {connectedPlayers.length} / {room.settings.maxPlayers}
              </span>
            </h2>

            {/* Ready / Host status indicator */}
            {!isHost && (
              <button
                onClick={() => {
                  sounds.playPop();
                  toggleReady();
                }}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center gap-2 border ${
                  isReady
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {isReady ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4 text-slate-400" />}
                <span>{isReady ? 'Ready!' : 'Click to Ready Up'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {connectedPlayers.map((p) => {
              const isMe = p.id === profile.id;
              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-2xl bg-slate-800/80 border transition-all flex items-center justify-between shadow-lg relative group ${
                    p.isReady ? 'border-emerald-500/40 shadow-emerald-500/5' : 'border-slate-700/80'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner relative"
                      style={{ backgroundColor: p.color + '25', border: `2px solid ${p.color}` }}
                    >
                      <span>{p.avatar}</span>
                      {p.isHost && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center shadow">
                          <Crown className="w-3 h-3 fill-slate-900" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">
                          {p.nickname}
                        </span>
                        {isMe && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${p.isReady ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        <span className="text-xs text-slate-400 font-medium">
                          {p.isHost ? 'Host' : p.isReady ? 'Ready' : 'Waiting'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Kick action (Host only, cannot kick self) */}
                  {isHost && !isMe && (
                    <button
                      onClick={() => {
                        sounds.playPop();
                        kickPlayer(p.id);
                      }}
                      title="Kick player"
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition-all text-xs"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Host Start Game Controls */}
          {isHost ? (
            <div className="pt-4">
              <button
                onClick={() => {
                  sounds.playPop();
                  startGame();
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-accent-pink hover:from-brand-500 hover:to-accent-pink/90 text-white font-extrabold text-lg shadow-xl shadow-brand-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
              >
                <Play className="w-6 h-6 fill-white group-hover:scale-110 transition-transform" />
                <span>Start Game ({connectedPlayers.length} {connectedPlayers.length === 1 ? 'Player' : 'Players'})</span>
              </button>
              <p className="text-xs text-center text-slate-400 mt-2">
                Tip: Invite your friends with the room link above before starting!
              </p>
            </div>
          ) : (
            <div className="pt-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-center">
              <p className="text-sm text-slate-300 font-medium">
                Waiting for the host to start the game...
              </p>
            </div>
          )}
        </div>

        {/* Right: Lobby Chat */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 shadow-xl flex flex-col h-[460px]">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-700/80">
            <MessageSquare className="w-4 h-4 text-brand-400" />
            <h3 className="font-bold text-white text-sm">Lobby Chat</h3>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3 text-xs">
            {chatMessages.length === 0 ? (
              <p className="text-slate-500 text-center py-8 italic">Say hello to other players!</p>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="py-1">
                  {msg.type === 'join' || msg.type === 'leave' || msg.type === 'system' ? (
                    <span className="text-slate-400 italic">🔔 {msg.text}</span>
                  ) : (
                    <div>
                      <span className="font-bold mr-1.5" style={{ color: msg.senderColor || '#818cf8' }}>
                        {msg.senderName}:
                      </span>
                      <span className="text-slate-200">{msg.text}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              maxLength={100}
              value={lobbyChat}
              onChange={(e) => setLobbyChat(e.target.value)}
              placeholder="Chat in lobby..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      <GameSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};
