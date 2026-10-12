import React, { useState } from 'react';
import {
  Gamepad2,
  Volume2,
  VolumeX,
  User,
  LogOut,
  HelpCircle,
  Globe,
  Sparkles,
  LayoutDashboard,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sound } from '../../services/soundService';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, extraData?: any) => void;
  onOpenHowToPlay: () => void;
  onOpenAuth?: (mode: 'login' | 'register' | 'forgot_password') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenHowToPlay,
  onOpenAuth,
}) => {
  const { currentUser, logout } = useAuth();
  const [soundOn, setSoundOn] = useState<boolean>(sound.isEnabled());
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);

  const toggleSound = () => {
    const next = sound.toggle();
    setSoundOn(next);
    if (next) sound.playClick();
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => {
            sound.playClick();
            onNavigate('home');
          }}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 transition-transform group-hover:scale-105">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 bg-clip-text text-transparent">
                QuizBattle
              </span>
              <span className="text-xs uppercase tracking-wider font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md border border-amber-300">
                Classroom
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Make classroom revision fun
            </p>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-semibold text-slate-600">
          <button
            onClick={() => {
              sound.playClick();
              onNavigate('home');
            }}
            className={`px-3 py-2 rounded-lg transition-colors ${
              currentView === 'home'
                ? 'text-indigo-600 bg-indigo-50 font-bold'
                : 'hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onNavigate('join');
            }}
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors ${
              currentView === 'join'
                ? 'text-indigo-600 bg-indigo-50 font-bold'
                : 'hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <KeyRound className="w-4 h-4 text-emerald-500" />
            Join Game
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onNavigate('public_games');
            }}
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors ${
              currentView === 'public_games'
                ? 'text-indigo-600 bg-indigo-50 font-bold'
                : 'hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Globe className="w-4 h-4 text-sky-500" />
            Public Games
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onOpenHowToPlay();
            }}
            className="px-3 py-2 rounded-lg flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-amber-500" />
            How to Play
          </button>
          {currentUser && (
            <button
              onClick={() => {
                sound.playClick();
                onNavigate('dashboard');
              }}
              className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors ${
                currentView === 'dashboard'
                  ? 'text-indigo-600 bg-indigo-50 font-bold'
                  : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-indigo-500" />
              Teacher Dashboard
            </button>
          )}
        </nav>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label="Toggle Sound"
            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200"
            title={soundOn ? 'Sound On' : 'Sound Muted'}
          >
            {soundOn ? <Volume2 className="w-5 h-5 text-indigo-600" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
          </button>

          {/* Teacher Profile / Auth */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 py-1 px-2.5 rounded-full border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 transition-all text-sm font-semibold text-indigo-900"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName}
                    className="w-7 h-7 rounded-full object-cover border border-indigo-300"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    {currentUser.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="max-w-[100px] truncate hidden sm:inline">{currentUser.displayName}</span>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-sm">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="font-bold text-slate-900 truncate">{currentUser.displayName}</p>
                    <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate('dashboard');
                    }}
                    className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                  >
                    <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                    Teacher Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate('create_game');
                    }}
                    className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                  >
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Create New Game
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate('profile');
                    }}
                    className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    Edit Profile
                  </button>
                  <div className="border-t border-slate-100 mt-1"></div>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                      onNavigate('home');
                    }}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  sound.playClick();
                  onNavigate('join');
                }}
                className="md:hidden px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white"
              >
                Join
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  if (onOpenAuth) {
                    onOpenAuth('login');
                  } else {
                    onNavigate('login');
                  }
                }}
                className="px-3.5 py-1.5 text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                Teacher Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
