import React, { useState, useEffect } from 'react';
import {
  Globe,
  Search,
  Filter,
  Play,
  Copy,
  Eye,
  BookOpen,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { Game } from '../../types/game';
import { GameService } from '../../services/gameService';
import { useAuth } from '../../context/AuthContext';
import { sound } from '../../services/soundService';

interface GameLibraryProps {
  onStartGame: (game: Game) => void;
  onPreviewGame: (game: Game) => void;
  onDuplicateGame: (game: Game) => void;
}

export const GameLibrary: React.FC<GameLibraryProps> = ({
  onStartGame,
  onPreviewGame,
  onDuplicateGame,
}) => {
  const { currentUser } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      try {
        const all = await GameService.getGames(currentUser?.uid);
        // Only public games
        const pub = all.filter((g) => g.visibility === 'public');
        setGames(pub);
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, [currentUser]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const subjects = ['all', ...Array.from(new Set(games.map((g) => g.subject).filter(Boolean)))];

  const filtered = games.filter((g) => {
    const matchesSearch =
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.description?.toLowerCase().includes(search.toLowerCase()) ||
      g.topic?.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || g.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const handleDuplicate = async (game: Game) => {
    sound.playVictory();
    try {
      const newOwnerId = currentUser?.uid || 'teacher_guest';
      const newOwnerName = currentUser?.displayName || 'Teacher';
      await GameService.duplicateGame(game, newOwnerId, newOwnerName);
      showNotification(`Duplicated "${game.title}" into your My Games library!`);
      onDuplicateGame(game);
    } catch {
      showNotification('Failed to duplicate game.');
    }
  };

  return (
    <div className="h-full max-h-full flex flex-col justify-between p-2.5 sm:p-4 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs shrink-0">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-700">
            <Globe className="w-3.5 h-3.5" />
            <span>Shared Classroom Resources</span>
          </div>
          <h1 className="text-base sm:text-lg font-extrabold text-slate-900 font-fun">
            Public Games Library
          </h1>
          <p className="text-xs text-slate-500 truncate max-w-lg">
            Discover ready-to-play quizzes created by educators. Play directly or duplicate to customize!
          </p>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search quizzes..."
              className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Subject Pills */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-xs pb-0.5">
            {subjects.map((subj) => (
              <button
                key={subj}
                onClick={() => {
                  sound.playClick();
                  setSelectedSubject(subj);
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold capitalize transition-all whitespace-nowrap cursor-pointer ${
                  selectedSubject === subj
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>
        </div>
      </div>

      {notification && (
        <div className="my-1.5 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shrink-0 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* Games Grid Container: Internal Scroll to prevent page-level scrollbars */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 my-2">

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No public games found</h3>
          <p className="text-xs text-slate-500 mt-1">Try another search term or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((game) => (
            <div
              key={game.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div>
                {/* Cover Image banner */}
                <div className="h-36 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 relative overflow-hidden">
                  {game.coverImage ? (
                    <img
                      src={game.coverImage}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30 font-bold text-3xl font-fun">
                      QuizBattle
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="text-[11px] font-bold bg-white/95 text-indigo-900 px-2 py-0.5 rounded-md shadow-xs">
                      {game.subject || 'General'} • {game.grade || 'Primary'}
                    </span>
                  </div>
                  <div className="absolute bottom-2 right-3">
                    <span className="text-[10px] font-bold bg-slate-900/80 text-white px-2 py-0.5 rounded-full">
                      By {game.ownerName || 'Educator'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-extrabold text-base text-slate-900 line-clamp-1 group-hover:text-sky-600 transition-colors">
                    {game.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 min-h-[2rem]">
                    {game.description || 'Interactive classroom team quiz game ready for play.'}
                  </p>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                    <span className="font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                      {game.questions?.length || game.questionCount || 0} Questions
                    </span>
                    <span className="text-[11px]">
                      Topic: <strong className="text-slate-700">{game.topic || 'General'}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-5 pt-0 flex items-center gap-2">
                <button
                  onClick={() => {
                    sound.playClick();
                    onStartGame(game);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  PLAY
                </button>

                <button
                  onClick={() => onPreviewGame(game)}
                  title="Preview Questions"
                  className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Preview</span>
                </button>

                <button
                  onClick={() => handleDuplicate(game)}
                  title="Duplicate to My Games"
                  className="py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Duplicate</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};
