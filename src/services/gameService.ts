import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Game, GameSession, GameAction, GameResult, Player, Team, PlayerAnswerSubmission } from '../types/game';
import { DEMO_GAME, SAMPLE_PUBLIC_GAMES } from './demoData';

const LOCAL_GAMES_KEY = 'quizbattle_local_games';
const LOCAL_SESSIONS_KEY = 'quizbattle_local_sessions';
const LOCAL_RESULTS_KEY = 'quizbattle_local_results';

export class GameService {
  /**
   * Get all games accessible to the current user (their own + public)
   */
  public static async getGames(userId?: string): Promise<Game[]> {
    const gamesMap = new Map<string, Game>();

    // Load built-in sample public games
    SAMPLE_PUBLIC_GAMES.forEach((g) => gamesMap.set(g.id, g));

    // Load from LocalStorage
    try {
      const local = localStorage.getItem(LOCAL_GAMES_KEY);
      if (local) {
        const parsed: Game[] = JSON.parse(local);
        parsed.forEach((g) => gamesMap.set(g.id, g));
      }
    } catch {
      // ignore
    }

    // Load from Firestore
    try {
      const gamesCol = collection(db, 'games');
      const snapshot = await getDocs(gamesCol);
      snapshot.forEach((d) => {
        const data = d.data() as Game;
        gamesMap.set(d.id, { ...data, id: d.id });
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'games');
    }

    return Array.from(gamesMap.values());
  }

  /**
   * Get single game by ID
   */
  public static async getGameById(gameId: string): Promise<Game | null> {
    if (gameId === DEMO_GAME.id) return DEMO_GAME;
    const sample = SAMPLE_PUBLIC_GAMES.find((g) => g.id === gameId);
    if (sample) return sample;

    // LocalStorage
    try {
      const local = localStorage.getItem(LOCAL_GAMES_KEY);
      if (local) {
        const parsed: Game[] = JSON.parse(local);
        const match = parsed.find((g) => g.id === gameId);
        if (match) return match;
      }
    } catch {
      // ignore
    }

    // Firestore
    try {
      const snap = await getDoc(doc(db, 'games', gameId));
      if (snap.exists()) {
        return snap.data() as Game;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `games/${gameId}`);
    }

    return null;
  }

  /**
   * Save or update a game
   */
  public static async saveGame(game: Game): Promise<void> {
    // Save to LocalStorage for offline/instant cache
    try {
      const local = localStorage.getItem(LOCAL_GAMES_KEY);
      let list: Game[] = local ? JSON.parse(local) : [];
      list = list.filter((g) => g.id !== game.id);
      list.unshift(game);
      localStorage.setItem(LOCAL_GAMES_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }

    // Save to Firestore
    try {
      await setDoc(doc(db, 'games', game.id), game);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `games/${game.id}`);
    }
  }

  /**
   * Delete a game
   */
  public static async deleteGame(gameId: string): Promise<void> {
    try {
      const local = localStorage.getItem(LOCAL_GAMES_KEY);
      if (local) {
        let list: Game[] = JSON.parse(local);
        list = list.filter((g) => g.id !== gameId);
        localStorage.setItem(LOCAL_GAMES_KEY, JSON.stringify(list));
      }
    } catch {
      // ignore
    }

    try {
      await deleteDoc(doc(db, 'games', gameId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `games/${gameId}`);
    }
  }

  /**
   * Duplicate a game (Requirement 53)
   */
  public static async duplicateGame(game: Game, newOwnerId: string, newOwnerName: string): Promise<Game> {
    const duplicated: Game = {
      ...game,
      id: `game_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: `${game.title} (Copy)`,
      ownerId: newOwnerId,
      ownerName: newOwnerName,
      visibility: 'private',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questions: game.questions?.map((q, idx) => ({
        ...q,
        id: `q_${Date.now()}_${idx}`,
        gameId: '', // will be set
      })),
    };
    if (duplicated.questions) {
      duplicated.questions.forEach((q) => (q.gameId = duplicated.id));
    }
    await this.saveGame(duplicated);
    return duplicated;
  }

  /**
   * Initialize default demo data in local storage
   */
  public static initializeDemoData(): void {
    try {
      const local = localStorage.getItem(LOCAL_GAMES_KEY);
      if (!local) {
        localStorage.setItem(LOCAL_GAMES_KEY, JSON.stringify([DEMO_GAME, ...SAMPLE_PUBLIC_GAMES]));
      }
    } catch {
      // ignore
    }
  }

  /**
   * Generate 6-digit Game PIN
   */
  public static generatePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Create a live session from a Game
   */
  public static async createSession(
    gameOrSession: Game | GameSession,
    hostId?: string,
    hostName?: string,
    teamCount: number = 3
  ): Promise<GameSession> {
    let session: GameSession;

    if ('pin' in gameOrSession) {
      session = gameOrSession as GameSession;
    } else {
      const game = gameOrSession as Game;
      const teamConfigs = [
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

      const teams: Team[] = [];
      const numTeams = Math.max(2, Math.min(10, teamCount));
      for (let i = 0; i < numTeams; i++) {
        teams.push({
          id: `team_${i + 1}`,
          name: teamConfigs[i]?.name || `Team ${i + 1}`,
          color: teamConfigs[i]?.color || '#4f46e5',
          avatar: teamConfigs[i]?.avatar || '⭐',
          score: 0,
        });
      }

      session = {
        id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        pin: this.generatePin(),
        gameId: game.id,
        gameTitle: game.title,
        hostId: hostId || 'teacher_guest',
        hostName: hostName || 'Teacher',
        status: 'lobby',
        currentQuestionId: null,
        currentTeamId: teams[0]?.id || null,
        answeredQuestionIds: [],
        skippedQuestionIds: [],
        teams,
        players: [],
        timerRemaining: game.settings?.defaultTimerSeconds || 25,
        isTimerRunning: false,
        answersRevealed: false,
        currentQuestionDoublePoints: false,
        playerAnswers: {},
        startedAt: Date.now(),
        updatedAt: Date.now(),
        settings: game.settings || {
          enableTimer: true,
          defaultTimerSeconds: 25,
          enablePowerUps: true,
          enableSpecialCards: true,
          randomizeQuestions: false,
          randomizeAnswers: false,
          enableSounds: true,
          allowNegativeScores: true,
          automaticScoring: true,
          enableConfetti: true,
        },
      };
    }

    // Save to LocalStorage
    try {
      const local = localStorage.getItem(LOCAL_SESSIONS_KEY);
      let list: GameSession[] = local ? JSON.parse(local) : [];
      list = list.filter((s) => s.id !== session.id);
      list.unshift(session);
      localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(list));
      localStorage.setItem('quizbattle_active_session_id', session.id);
    } catch {
      // ignore
    }

    try {
      await setDoc(doc(db, 'gameSessions', session.id), session);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `gameSessions/${session.id}`);
    }

    return session;
  }

  /**
   * Update active session
   */
  public static async updateSession(session: GameSession): Promise<void> {
    // LocalStorage
    try {
      const local = localStorage.getItem(LOCAL_SESSIONS_KEY);
      let list: GameSession[] = local ? JSON.parse(local) : [];
      list = list.map((s) => (s.id === session.id ? session : s));
      localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }

    try {
      await updateDoc(doc(db, 'gameSessions', session.id), { ...session });
    } catch (err) {
      // If updateDoc fails because document doesn't exist yet, fallback to setDoc
      try {
        await setDoc(doc(db, 'gameSessions', session.id), session);
      } catch (innerErr) {
        handleFirestoreError(innerErr, OperationType.WRITE, `gameSessions/${session.id}`);
      }
    }
  }

  /**
   * Find session by 6-digit PIN
   */
  public static async getSessionByPin(pin: string): Promise<GameSession | null> {
    // Check Firestore
    try {
      const q = query(collection(db, 'gameSessions'), where('pin', '==', pin.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as GameSession;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'gameSessions');
    }

    // Check LocalStorage
    try {
      const local = localStorage.getItem(LOCAL_SESSIONS_KEY);
      if (local) {
        const list: GameSession[] = JSON.parse(local);
        const match = list.find((s) => s.pin === pin.trim());
        if (match) return match;
      }
    } catch {
      // ignore
    }

    return null;
  }

  /**
   * Get session by ID
   */
  public static async getSessionById(sessionId: string): Promise<GameSession | null> {
    try {
      const snap = await getDoc(doc(db, 'gameSessions', sessionId));
      if (snap.exists()) {
        return snap.data() as GameSession;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `gameSessions/${sessionId}`);
    }

    try {
      const local = localStorage.getItem(LOCAL_SESSIONS_KEY);
      if (local) {
        const list: GameSession[] = JSON.parse(local);
        const match = list.find((s) => s.id === sessionId);
        if (match) return match;
      }
    } catch {
      // ignore
    }

    return null;
  }

  /**
   * Alias for getSessionByPin
   */
  public static async findSessionByPin(pin: string): Promise<GameSession | null> {
    return this.getSessionByPin(pin);
  }

  /**
   * Join an active session
   */
  public static async joinSession(sessionId: string, player: Player): Promise<GameSession> {
    let session = await this.getSessionById(sessionId);
    if (!session) {
      const local = localStorage.getItem(LOCAL_SESSIONS_KEY);
      if (local) {
        const list: GameSession[] = JSON.parse(local);
        session = list.find((s: GameSession) => s.id === sessionId) || null;
      }
    }

    if (!session) {
      throw new Error('Session not found.');
    }

    // Check if player already exists
    const existingIdx = session.players.findIndex((p: Player) => p.id === player.id || p.name === player.name);
    let updatedPlayers = [...session.players];
    if (existingIdx >= 0) {
      updatedPlayers[existingIdx] = player;
    } else {
      updatedPlayers.push(player);
    }

    const updated: GameSession = {
      ...session,
      players: updatedPlayers,
      updatedAt: Date.now(),
    };

    await this.updateSession(updated);
    return updated;
  }

  /**
   * Submit an answer from a pupil
   */
  public static async submitPlayerAnswer(
    sessionId: string,
    submission: PlayerAnswerSubmission
  ): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) return;

    const playerAnswers = {
      ...(session.playerAnswers || {}),
      [submission.playerId]: submission,
    };

    const updated: GameSession = {
      ...session,
      playerAnswers,
      updatedAt: Date.now(),
    };

    await this.updateSession(updated);
  }

  /**
   * Subscribe to session real-time updates (cross-device & local)
   */
  public static subscribeToSession(sessionId: string, callback: (session: GameSession | null) => void): () => void {
    // Realtime Firestore subscription
    let unsubscribeFirestore: () => void = () => {};
    try {
      unsubscribeFirestore = onSnapshot(
        doc(db, 'gameSessions', sessionId),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as GameSession;
            callback(data);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, `gameSessions/${sessionId}`);
        }
      );
    } catch (err) {
      console.warn('Realtime firestore listener unavailable, using local polling fallback');
    }

    // LocalStorage storage event listener for cross-tab sync
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === LOCAL_SESSIONS_KEY && e.newValue) {
        try {
          const list: GameSession[] = JSON.parse(e.newValue);
          const current = list.find((s) => s.id === sessionId);
          if (current) callback(current);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      unsubscribeFirestore();
      window.removeEventListener('storage', handleStorageEvent);
    };
  }

  /**
   * Record a game score action to Firestore and LocalStorage
   */
  public static async recordAction(action: GameAction): Promise<void> {
    const key = `quizbattle_actions_${action.sessionId}`;
    try {
      const raw = localStorage.getItem(key);
      const list: GameAction[] = raw ? JSON.parse(raw) : [];
      list.push(action);
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      // ignore
    }

    try {
      await setDoc(doc(db, 'gameSessions', action.sessionId, 'actions', action.id), action);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `gameSessions/${action.sessionId}/actions/${action.id}`);
    }
  }

  /**
   * Fetch actions history for a session
   */
  public static async getSessionActions(sessionId: string): Promise<GameAction[]> {
    const actionsMap = new Map<string, GameAction>();

    // Local
    try {
      const key = `quizbattle_actions_${sessionId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const list: GameAction[] = JSON.parse(raw);
        list.forEach((a) => actionsMap.set(a.id, a));
      }
    } catch {
      // ignore
    }

    // Firestore
    try {
      const q = query(collection(db, 'gameSessions', sessionId, 'actions'), orderBy('timestamp', 'asc'));
      const snap = await getDocs(q);
      snap.forEach((d) => actionsMap.set(d.id, d.data() as GameAction));
    } catch {
      // ignore
    }

    return Array.from(actionsMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Save finished Game Result & Statistics
   */
  public static async saveGameResult(result: GameResult): Promise<void> {
    try {
      const local = localStorage.getItem(LOCAL_RESULTS_KEY);
      let list: GameResult[] = local ? JSON.parse(local) : [];
      list = list.filter((r) => r.id !== result.id);
      list.unshift(result);
      localStorage.setItem(LOCAL_RESULTS_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }

    try {
      await setDoc(doc(db, 'gameResults', result.id), result);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `gameResults/${result.id}`);
    }
  }

  /**
   * Fetch all finished game results for host
   */
  public static async getGameResults(hostId?: string): Promise<GameResult[]> {
    const resultsMap = new Map<string, GameResult>();

    try {
      const local = localStorage.getItem(LOCAL_RESULTS_KEY);
      if (local) {
        const list: GameResult[] = JSON.parse(local);
        list.forEach((r) => resultsMap.set(r.id, r));
      }
    } catch {
      // ignore
    }

    try {
      const snap = await getDocs(collection(db, 'gameResults'));
      snap.forEach((d) => {
        const res = d.data() as GameResult;
        if (!hostId || res.hostId === hostId) {
          resultsMap.set(d.id, res);
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'gameResults');
    }

    return Array.from(resultsMap.values()).sort(
      (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
    );
  }
}
