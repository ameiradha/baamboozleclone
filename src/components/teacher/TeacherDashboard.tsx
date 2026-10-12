import React, { useState, useEffect } from 'react';
import {
  Plus,
  Play,
  Edit3,
  Copy,
  Trash2,
  Eye,
  BarChart3,
  Sparkles,
  Gamepad2,
  Users2,
  BookOpen,
  Calendar,
  Lock,
  Globe2,
  Flame,
  Award,
  Search,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Game, GameResult } from '../../types/game';
import { GameService } from '../../services/gameService';
import { sound } from '../../services/soundService';
import { DEMO_GAME } from '../../services/demoData';

interface TeacherDashboardProps {
  onNavigate: (view: string, extraData?: any) => void;
  onStartGame: (game: Game) => void;
  onEditGame: (game: Game) => void;
  onPreviewGame: (game: Game) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onNavigate,
  onStartGame,
  onEditGame,
  onPreviewGame,
}) => {
  const { currentUser } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [results, setResults] = useState<GameResult[]>([]);
  const [activeTab, setActiveTab] = useState<'my_games' | 'recent' | 'stats'>('my_games');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const allGames = await GameService.getGames(currentUser?.uid);
      setGames(allGames);
      const allResults = await GameService.getGameResults(currentUser?.uid);
      setResults(allResults);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDuplicate = async (game: Game) => {
    sound.playClick();
    try {
      const newOwnerId = currentUser?.uid || 'teacher_guest';
      const newOwnerName = currentUser?.displayName || 'Teacher';
      const copy = await GameService.duplicateGame(game, newOwnerId, newOwnerName);
      setGames((prev) => [copy, ...prev]);
      showNotification(`Duplicated "${game.title}" successfully!`);
    } catch {
      showNotification('Failed to duplicate game.');
    }
  };

  const handleDelete = async (gameId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    sound.playClick();
    try {
      await GameService.deleteGame(gameId);
      setGames((prev) => prev.filter((g) => g.id !== gameId));
      showNotification(`Deleted "${title}".`);
    } catch {
      showNotification('Failed to delete game.');
    }
  };

  // Filter games created by user (or demo games)
  const myGames = games.filter(
    (g) =>
      g.ownerId === currentUser?.uid ||
      g.ownerId === 'teacher_demo_system' ||
      g.ownerId === 'teacher_demo_101' ||
      !currentUser
  );

  const filteredMyGames = myGames.filter((g) =>
    g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats calculation
  const totalGamesCount = myGames.length;
  const totalQuestionsCount = myGames.reduce((acc, g) => acc + (g.questions?.length || g.questionCount || 0), 0);
  const totalGamesPlayed = results.length;

  return (
    <div className="h-full max-h-full flex flex-col justify-between p-2.5 sm:p-4 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Top Banner with Teacher Greetings & Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-900 rounded-2xl p-3 sm:p-4 text-white shadow-xs shrink-0">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Teacher Control Room</span>
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold mt-0.5 font-fun">
            Welcome back, {currentUser?.displayName || 'Teacher'}! 🍎
          </h1>
          <p className="text-xs text-indigo-100 max-w-xl truncate">
            Manage your classroom quizzes, launch live sessions, or review pupil performances.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              onNavigate('create_game');
            }}
            className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-900" />
            <span>Create Quiz</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="my-1.5 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Metrics Row: Compact & Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2 shrink-0">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-500 truncate">Total Games</p>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">{totalGamesCount}</h3>
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-500 truncate">Games Played</p>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">{totalGamesPlayed}</h3>
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-500 truncate">Total Questions</p>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">{totalQuestionsCount}</h3>
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-500 truncate">Sessions Finished</p>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">{results.length}</h3>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('my_games');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'my_games'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            My Games ({myGames.length})
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('recent');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'recent'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Recently Played ({results.length})
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('stats');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'stats'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Class Statistics
          </button>
        </div>

        {activeTab === 'my_games' && (
          <div className="relative w-56 hidden sm:block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search my games..."
              className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Tab Content Wrapper: Internal Scroll to prevent page-level scrollbars */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 my-2">

      {/* Tab 1: My Games */}
      {activeTab === 'my_games' && (
        <div className="mt-6">
          {filteredMyGames.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-700">No games created yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Build your very first quiz with multiple choice questions, timers, and power-up cards!
              </p>
              <button
                onClick={() => onNavigate('create_game')}
                className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              >
                Create Game Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMyGames.map((game) => (
                <div
                  key={game.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div>
                    {/* Cover or placeholder banner */}
                    <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600 relative overflow-hidden">
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
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full backdrop-blur-md shadow-xs ${
                            game.visibility === 'public'
                              ? 'bg-emerald-500/90 text-white'
                              : 'bg-slate-900/80 text-white'
                          }`}
                        >
                          {game.visibility === 'public' ? 'Public' : 'Private'}
                        </span>
                      </div>
                      <div className="absolute bottom-2 left-3">
                        <span className="text-[11px] font-bold bg-white/90 text-indigo-900 px-2 py-0.5 rounded-md shadow-xs">
                          {game.subject || 'General'} • {game.grade || 'Primary'}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="font-extrabold text-base text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {game.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 min-h-[2rem]">
                        {game.description || 'No description provided.'}
                      </p>

                      <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                        <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {game.questions?.length || game.questionCount || 0} Questions
                        </span>
                        <span className="text-[11px]">
                          Topic: <strong className="text-slate-700">{game.topic || 'General'}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="px-5 pb-5 pt-0">
                    {/* Primary Play Button */}
                    <button
                      onClick={() => {
                        sound.playClick();
                        onStartGame(game);
                      }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mb-2"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      PLAY GAME
                    </button>

                    {/* Secondary Utility Controls */}
                    <div className="grid grid-cols-4 gap-1.5 text-xs text-slate-600">
                      <button
                        onClick={() => onEditGame(game)}
                        title="Edit Game"
                        className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-1 font-semibold transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button
                        onClick={() => onPreviewGame(game)}
                        title="Preview Questions"
                        className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-1 font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span className="hidden sm:inline">Preview</span>
                      </button>
                      <button
                        onClick={() => handleDuplicate(game)}
                        title="Duplicate Game"
                        className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-1 font-semibold transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        <span className="hidden sm:inline">Copy</span>
                      </button>
                      <button
                        onClick={() => handleDelete(game.id, game.title)}
                        title="Delete Game"
                        className="py-1.5 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center gap-1 font-semibold transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Del</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Recently Played Games */}
      {activeTab === 'recent' && (
        <div className="mt-6">
          {results.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-700">No game sessions played yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Launch a live game session with your class to record scores and see post-game summaries here!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((res) => (
                <div
                  key={res.id}
                  className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div>
                    <span className="text-[11px] font-bold text-slate-400">
                      {new Date(res.playedAt).toLocaleDateString()} at {new Date(res.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <h4 className="text-lg font-extrabold text-slate-900 mt-0.5">{res.gameTitle}</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                        🏆 Winner: {res.winnerTeam?.name || 'Tied'} ({res.winnerTeam?.score || 0})
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                        {res.teams.length} Teams
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                        {res.questionsAnswered} Questions Answered
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      sound.playClick();
                      onNavigate('game_results', { result: res });
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4" />
                    View Game Report
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Classroom Statistics */}
      {activeTab === 'stats' && (
        <div className="mt-6 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 font-fun">Overall Classroom Learning Stats</h3>
              <p className="text-xs text-slate-500">Aggregated performance across all played quiz sessions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Games Hosted</p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">{results.length}</p>
              <p className="text-xs text-slate-500 mt-2">Active revision lessons with your classes</p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Questions Answered</p>
              <p className="text-3xl font-extrabold text-indigo-600 mt-1">
                {results.reduce((acc, r) => acc + (r.questionsAnswered || 0), 0)}
              </p>
              <p className="text-xs text-slate-500 mt-2">MCQ, True/False, and Short Answers answered</p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Power-Ups Triggered</p>
              <p className="text-3xl font-extrabold text-amber-600 mt-1">
                {results.reduce((acc, r) => acc + (r.totalPowerUpsUsed || 0), 0)}
              </p>
              <p className="text-xs text-slate-500 mt-2">Steals, Swaps, and Bonus cards used</p>
            </div>
          </div>

          {results.length > 0 && (
            <div className="mt-8">
              <h4 className="font-bold text-slate-900 text-sm mb-3">Session Breakdown</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {results.map((r, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-900">{r.gameTitle}</span>
                      <span className="text-slate-400 ml-2">({new Date(r.playedAt).toLocaleDateString()})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        Winner: {r.winnerTeam?.name} ({r.winnerTeam?.score})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};
