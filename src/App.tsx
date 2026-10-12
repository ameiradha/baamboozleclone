import React, { useState, useEffect } from 'react';
import { Navbar } from './components/common/Navbar';
import { HomePage } from './components/home/HomePage';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { GameLibrary } from './components/teacher/GameLibrary';
import { GameEditor } from './components/teacher/GameEditor';
import { GameLobbyHost } from './components/teacher/GameLobbyHost';
import { LiveGameHost } from './components/teacher/LiveGameHost';
import { QuestionPreviewModal } from './components/teacher/QuestionPreviewModal';
import { StudentJoinView } from './components/student/StudentJoinView';
import { GameResultsView } from './components/results/GameResultsView';
import { AuthModal } from './components/auth/AuthModal';
import { HowToPlayModal } from './components/howToPlay/HowToPlayModal';
import { useAuth } from './context/AuthContext';
import { Game, GameSession, GameResult } from './types/game';
import { GameService } from './services/gameService';
import { DEMO_GAME } from './services/demoData';
import { sound } from './services/soundService';

export function App() {
  const { currentUser, isDemoUser } = useAuth();

  // Navigation State
  const [currentView, setCurrentView] = useState<string>('home');
  const [extraViewData, setExtraViewData] = useState<any>(null);

  // Active Game / Session States
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const [latestGameResult, setLatestGameResult] = useState<GameResult | null>(null);

  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [showHowToPlayModal, setShowHowToPlayModal] = useState(false);
  const [previewGame, setPreviewGame] = useState<Game | null>(null);

  // Initialize demo data in database/localStorage on first load
  useEffect(() => {
    GameService.initializeDemoData();
  }, []);

  const navigateTo = (view: string, data?: any) => {
    setExtraViewData(data);

    if (view === 'create_game') {
      setSelectedGame(null);
      setCurrentView('create_game');
    } else if (view === 'public_games') {
      setCurrentView('library');
    } else if (view === 'game_results' && data?.result) {
      setLatestGameResult(data.result);
      setCurrentView('game_results');
    } else {
      setCurrentView(view);
    }
  };

  // Launch Live Game Session as Host
  const handleHostGame = async (gameToHost: Game) => {
    sound.playClick();
    setSelectedGame(gameToHost);
    try {
      const session = await GameService.createSession(
        gameToHost,
        currentUser?.uid || 'teacher_guest',
        currentUser?.displayName || 'Teacher',
        3 // Default 3 teams
      );
      setActiveSession(session);
      setCurrentView('lobby');
    } catch (e) {
      console.error('Failed to create session', e);
      alert('Could not start game session.');
    }
  };

  // Instant 1-Click Demo Game launch from Home page
  const handleStartDemoGame = async () => {
    await handleHostGame(DEMO_GAME);
  };

  // Edit Game
  const handleEditGame = (gameToEdit: Game) => {
    sound.playClick();
    setSelectedGame(gameToEdit);
    setCurrentView('edit_game');
  };

  // Preview Game Questions
  const handlePreviewGame = (gameToPreview: Game) => {
    sound.playClick();
    setPreviewGame(gameToPreview);
  };

  return (
    <div className="h-screen h-dvh max-h-screen max-h-dvh overflow-hidden bg-slate-50 font-sans text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Hide standard navbar when inside live game session for maximal screen area */}
      {currentView !== 'live_game' && (
        <Navbar
          currentView={currentView}
          onNavigate={navigateTo}
          onOpenAuth={(mode) => {
            setAuthMode(mode);
            setShowAuthModal(true);
          }}
          onOpenHowToPlay={() => setShowHowToPlayModal(true)}
        />
      )}

      {/* Main Content Router */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* VIEW 1: HOME */}
        {currentView === 'home' && (
          <HomePage
            onNavigate={navigateTo}
            onStartDemoGame={handleStartDemoGame}
          />
        )}

        {/* VIEW 2: TEACHER DASHBOARD */}
        {currentView === 'dashboard' && (
          <TeacherDashboard
            onNavigate={navigateTo}
            onStartGame={handleHostGame}
            onEditGame={handleEditGame}
            onPreviewGame={handlePreviewGame}
          />
        )}

        {/* VIEW 3: PUBLIC GAMES LIBRARY */}
        {(currentView === 'library' || currentView === 'public_games') && (
          <GameLibrary
            onStartGame={handleHostGame}
            onPreviewGame={handlePreviewGame}
            onDuplicateGame={(dup) => {
              setSelectedGame(dup);
              setCurrentView('dashboard');
            }}
          />
        )}

        {/* VIEW 4: CREATE / EDIT GAME */}
        {(currentView === 'create_game' || currentView === 'edit_game') && (
          <GameEditor
            initialGame={selectedGame}
            onNavigate={navigateTo}
            onSaveSuccess={(saved) => {
              setSelectedGame(saved);
              setCurrentView('dashboard');
            }}
          />
        )}

        {/* VIEW 5: LOBBY HOST SCREEN */}
        {currentView === 'lobby' && activeSession && selectedGame && (
          <GameLobbyHost
            session={activeSession}
            game={selectedGame}
            onStartGame={(updated) => {
              setActiveSession(updated);
              setCurrentView('live_game');
            }}
            onCancelSession={() => {
              setActiveSession(null);
              setCurrentView('dashboard');
            }}
          />
        )}

        {/* VIEW 6: LIVE GAME HOST (THE CLASSROOM BOARD) */}
        {currentView === 'live_game' && activeSession && selectedGame && (
          <LiveGameHost
            session={activeSession}
            game={selectedGame}
            onGameFinished={(result) => {
              setLatestGameResult(result);
              setCurrentView('game_results');
            }}
            onExitGame={() => {
              setActiveSession(null);
              setCurrentView('dashboard');
            }}
          />
        )}

        {/* VIEW 7: STUDENT JOIN SCREEN */}
        {currentView === 'join' && (
          <StudentJoinView
            initialPin={extraViewData?.pin || ''}
            onExit={() => setCurrentView('home')}
          />
        )}

        {/* VIEW 8: POST-GAME RESULTS SCREEN */}
        {currentView === 'game_results' && latestGameResult && (
          <GameResultsView
            result={latestGameResult}
            onPlayAgain={() => {
              if (selectedGame) {
                handleHostGame(selectedGame);
              } else {
                setCurrentView('dashboard');
              }
            }}
            onReturnToDashboard={() => setCurrentView('dashboard')}
            onNewGame={() => setCurrentView('create_game')}
          />
        )}
      </main>

      {/* Global Modals */}
      {showAuthModal && (
        <AuthModal
          initialMode={authMode}
          onSuccess={() => setShowAuthModal(false)}
          onCancel={() => setShowAuthModal(false)}
        />
      )}

      {showHowToPlayModal && (
        <HowToPlayModal
          isOpen={showHowToPlayModal}
          onClose={() => setShowHowToPlayModal(false)}
        />
      )}

      {previewGame && (
        <QuestionPreviewModal
          game={previewGame}
          isOpen={!!previewGame}
          onClose={() => setPreviewGame(null)}
        />
      )}
    </div>
  );
}

export default App;
