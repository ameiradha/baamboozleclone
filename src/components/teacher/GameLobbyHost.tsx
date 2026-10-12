import React, { useState, useEffect } from 'react';
import {
  Users2,
  Play,
  KeyRound,
  Copy,
  CheckCircle2,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Minus,
  Edit3,
  Smile,
  Palette,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Gamepad2,
  HelpCircle,
} from 'lucide-react';
import { Game, GameSession, Team, Player } from '../../types/game';
import { GameService } from '../../services/gameService';
import { sound } from '../../services/soundService';

interface GameLobbyHostProps {
  session: GameSession;
  game: Game;
  onStartGame: (updatedSession: GameSession) => void;
  onCancelSession: () => void;
}

const DEFAULT_TEAM_CONFIGS = [
  { name: 'Team 1', color: '#3b82f6', avatar: '🦁' },
  { name: 'Team 2', color: '#10b981', avatar: '🐬' },
  { name: 'Team 3', color: '#f59e0b', avatar: '🦅' },
  { name: 'Team 4', color: '#8b5cf6', avatar: '🦊' },
  { name: 'Team 5', color: '#ec4899', avatar: '🐼' },
  { name: 'Team 6', color: '#06b6d4', avatar: '🐯' },
  { name: 'Team 7', color: '#f97316', avatar: '🐲' },
  { name: 'Team 8', color: '#84cc16', avatar: '🦉' },
  { name: 'Team 9', color: '#a855f7', avatar: '🦄' },
  { name: 'Team 10', color: '#ef4444', avatar: '⚡' },
];

const AVAILABLE_AVATARS = [
  '🦁', '🐬', '🦅', '🦊', '🐼', '🐯', '🐲', '🦉', '🦄', '⚡',
  '🚀', '🌟', '🎯', '🦖', '🏆', '🔥', '🤖', '👑', '🌈', '🍕'
];

const AVAILABLE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#f97316', '#84cc16', '#a855f7', '#ef4444'
];

export const GameLobbyHost: React.FC<GameLobbyHostProps> = ({
  session,
  game,
  onStartGame,
  onCancelSession,
}) => {
  const [currentSession, setCurrentSession] = useState<GameSession>(session);
  const [copiedPin, setCopiedPin] = useState(false);
  const [editingAvatarTeamId, setEditingAvatarTeamId] = useState<string | null>(null);
  const [showDevicePinSection, setShowDevicePinSection] = useState(false);
  const [cardsMultiplier, setCardsMultiplier] = useState<2 | 3 | 10>(
    session.settings?.cardsPerTeamMultiplier || 3
  );

  // Subscribe to real-time session updates (if any devices join)
  useEffect(() => {
    const unsub = GameService.subscribeToSession(session.id, (updated) => {
      if (updated) {
        setCurrentSession(updated);
      }
    });
    return () => unsub();
  }, [session.id]);

  // Adjust team count directly (2 to 10 teams)
  const handleSetTeamCount = async (count: number) => {
    sound.playClick();
    const clampedCount = Math.max(2, Math.min(10, count));

    const newTeams: Team[] = [];
    for (let i = 0; i < clampedCount; i++) {
      if (currentSession.teams[i]) {
        newTeams.push(currentSession.teams[i]);
      } else {
        const cfg = DEFAULT_TEAM_CONFIGS[i] || {
          name: `Team ${i + 1}`,
          color: AVAILABLE_COLORS[i % AVAILABLE_COLORS.length],
          avatar: AVAILABLE_AVATARS[i % AVAILABLE_AVATARS.length],
        };
        newTeams.push({
          id: `team_${Date.now()}_${i + 1}`,
          name: cfg.name,
          color: cfg.color,
          avatar: cfg.avatar,
          score: 0,
        });
      }
    }

    const updated: GameSession = {
      ...currentSession,
      teams: newTeams,
      currentTeamId: newTeams[0]?.id || null,
      updatedAt: Date.now(),
    };
    setCurrentSession(updated);
    await GameService.updateSession(updated);
  };

  // Add 1 Team (up to 10)
  const handleAddTeam = async () => {
    if (currentSession.teams.length >= 10) return;
    sound.playBonus();
    const nextIdx = currentSession.teams.length;
    const cfg = DEFAULT_TEAM_CONFIGS[nextIdx] || {
      name: `Team ${nextIdx + 1}`,
      color: AVAILABLE_COLORS[nextIdx % AVAILABLE_COLORS.length],
      avatar: AVAILABLE_AVATARS[nextIdx % AVAILABLE_AVATARS.length],
    };

    const newTeam: Team = {
      id: `team_${Date.now()}_${nextIdx + 1}`,
      name: cfg.name,
      color: cfg.color,
      avatar: cfg.avatar,
      score: 0,
    };

    const updatedTeams = [...currentSession.teams, newTeam];
    const updated: GameSession = {
      ...currentSession,
      teams: updatedTeams,
      updatedAt: Date.now(),
    };
    setCurrentSession(updated);
    await GameService.updateSession(updated);
  };

  // Remove a specific team (minimum 2 teams)
  const handleRemoveTeam = async (teamId: string) => {
    if (currentSession.teams.length <= 2) {
      return;
    }
    sound.playClick();
    const updatedTeams = currentSession.teams.filter((t) => t.id !== teamId);
    const updated: GameSession = {
      ...currentSession,
      teams: updatedTeams,
      currentTeamId: updatedTeams[0]?.id || null,
      updatedAt: Date.now(),
    };
    setCurrentSession(updated);
    await GameService.updateSession(updated);
  };

  // Rename team
  const handleUpdateTeamName = async (teamId: string, newName: string) => {
    const updatedTeams = currentSession.teams.map((t) =>
      t.id === teamId ? { ...t, name: newName } : t
    );
    const updated: GameSession = { ...currentSession, teams: updatedTeams };
    setCurrentSession(updated);
    await GameService.updateSession(updated);
  };

  // Update team avatar
  const handleUpdateTeamAvatar = async (teamId: string, newAvatar: string) => {
    sound.playClick();
    const updatedTeams = currentSession.teams.map((t) =>
      t.id === teamId ? { ...t, avatar: newAvatar } : t
    );
    const updated: GameSession = { ...currentSession, teams: updatedTeams };
    setCurrentSession(updated);
    setEditingAvatarTeamId(null);
    await GameService.updateSession(updated);
  };

  // Update team color
  const handleUpdateTeamColor = async (teamId: string, newColor: string) => {
    sound.playClick();
    const updatedTeams = currentSession.teams.map((t) =>
      t.id === teamId ? { ...t, color: newColor } : t
    );
    const updated: GameSession = { ...currentSession, teams: updatedTeams };
    setCurrentSession(updated);
    await GameService.updateSession(updated);
  };

  const copyPin = () => {
    sound.playClick();
    navigator.clipboard.writeText(currentSession.pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleStartGame = async () => {
    sound.playVictory();
    const updated: GameSession = {
      ...currentSession,
      status: 'playing',
      currentTeamId: currentSession.teams[0]?.id || null,
      settings: {
        ...currentSession.settings,
        cardsPerTeamMultiplier: cardsMultiplier,
      },
      updatedAt: Date.now(),
    };
    await GameService.updateSession(updated);
    onStartGame(updated);
  };

  const teamCount = currentSession.teams.length;

  return (
    <div className="h-full max-h-full flex flex-col justify-between p-3 sm:p-4 max-w-6xl mx-auto w-full overflow-hidden">
      {/* Top Header Card: Compact & Viewport-Fitting */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-4 shadow-xs mb-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button
              onClick={onCancelSession}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                {game.title}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  PIN: {currentSession.pin}
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="font-semibold text-slate-700">{cardsMultiplier * teamCount} Cards Total ({cardsMultiplier}× per team)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddTeam}
              disabled={teamCount >= 10}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              + Add Team
            </button>
            <button
              onClick={handleStartGame}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start Game</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Controls Toolbar: Multiplier & Quick Team Selector */}
        <div className="pt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Multiplier buttons */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Board Size:</span>
            {[
              { val: 2, label: `2× (${2 * teamCount} Cards)` },
              { val: 3, label: `3× (${3 * teamCount} Cards)` },
              { val: 10, label: `10× (${10 * teamCount} Cards)` },
            ].map((m) => (
              <button
                key={m.val}
                type="button"
                onClick={() => {
                  sound.playClick();
                  setCardsMultiplier(m.val as 2 | 3 | 10);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  cardsMultiplier === m.val
                    ? 'bg-amber-400 text-slate-950 shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Quick Team Count */}
          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-500 mr-0.5">Teams:</span>
            {[2, 3, 4, 5, 6, 8, 10].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleSetTeamCount(num)}
                className={`px-2 py-0.5 rounded font-mono font-bold text-xs transition-colors cursor-pointer ${
                  teamCount === num
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Team Cards Grid - Clean, Responsive & Contained */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 my-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
          {currentSession.teams.map((team, idx) => (
            <div
              key={team.id}
              className="bg-white rounded-2xl border-2 border-slate-200/90 hover:border-slate-300 p-3.5 sm:p-4 flex flex-col justify-between transition-all shadow-xs relative group overflow-hidden"
              style={{ borderTopColor: team.color, borderTopWidth: '5px' }}
            >
              {/* Header: Mascot + Delete */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
                    Team #{idx + 1}
                  </span>

                  {teamCount > 2 && (
                    <button
                      onClick={() => handleRemoveTeam(team.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete this team"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Team Mascot & Name Editor */}
                <div className="flex items-center gap-2.5 mb-2.5">
                  {/* Avatar Picker Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingAvatarTeamId(
                          editingAvatarTeamId === team.id ? null : team.id
                        )
                      }
                      className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-400 shadow-2xs flex items-center justify-center text-2xl transition-transform hover:scale-105 active:scale-95 cursor-pointer relative"
                      title="Click to change team mascot"
                    >
                      <span>{team.avatar}</span>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Smile className="w-2.5 h-2.5" />
                      </span>
                    </button>

                    {/* Popover Emoji Picker */}
                    {editingAvatarTeamId === team.id && (
                      <div className="absolute left-0 top-13 z-30 p-2 bg-white rounded-xl shadow-xl border border-slate-200 w-52 animate-in fade-in zoom-in-95 duration-150">
                        <div className="text-[10px] font-bold text-slate-500 mb-1.5 px-1">
                          Choose Mascot:
                        </div>
                        <div className="grid grid-cols-5 gap-1 max-h-36 overflow-y-auto">
                          {AVAILABLE_AVATARS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleUpdateTeamAvatar(team.id, emoji)}
                              className={`w-8 h-8 rounded-lg hover:bg-indigo-50 text-lg flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                                team.avatar === emoji
                                  ? 'bg-indigo-100 ring-2 ring-indigo-500'
                                  : ''
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Team Name Input */}
                  <div className="flex-1 min-w-0">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Team Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={team.name}
                        onChange={(e) => handleUpdateTeamName(team.id, e.target.value)}
                        placeholder="Enter name"
                        className="w-full font-bold text-sm text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 rounded-lg px-2 py-1 transition-all"
                      />
                      <Edit3 className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Color Palette Selector */}
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {AVAILABLE_COLORS.slice(0, 8).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleUpdateTeamColor(team.id, color)}
                        className={`w-4 h-4 rounded-full transition-transform hover:scale-125 cursor-pointer ${
                          team.color === color
                            ? 'ring-2 ring-offset-1 ring-slate-800 scale-110'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer: Ready Badge */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-400">Score: 0 pts</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Ready
                </span>
              </div>
            </div>
          ))}

          {/* Add Team Card Slot (if less than 10 teams) */}
          {teamCount < 10 && (
            <button
              onClick={handleAddTeam}
              className="rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/70 p-4 flex flex-col items-center justify-center text-center transition-all group cursor-pointer min-h-[140px]"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform mb-2">
                <Plus className="w-4 h-4 stroke-[3]" />
              </div>
              <h4 className="font-bold text-indigo-950 text-xs font-fun">
                + Add Team #{teamCount + 1}
              </h4>
              <p className="text-[10px] text-indigo-600/80 mt-0.5">
                Supports up to 10 teams
              </p>
            </button>
          )}
        </div>
      </div>

      {/* Sleek Compact Bottom Toolbar: Optional Pupil Buzzer Device Mode */}
      <div className="bg-white rounded-xl border border-slate-200/90 px-3 py-2 shadow-xs shrink-0 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-md bg-indigo-50 text-indigo-600 shrink-0">
            <KeyRound className="w-3.5 h-3.5" />
          </div>
          <span className="text-slate-600 font-medium truncate hidden sm:inline">Pupil Device Buzzer Mode:</span>
          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
            PIN: {currentSession.pin}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={copyPin}
            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copiedPin ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy PIN</span>
              </>
            )}
          </button>

          <button
            onClick={handleStartGame}
            className="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Play className="w-3 h-3 fill-white" />
            <span>Start</span>
          </button>
        </div>
      </div>
    </div>
  );
};
