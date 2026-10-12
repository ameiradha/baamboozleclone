import { GameSession, Team, GameAction } from '../types/game';

export interface ScoreMutationResult {
  updatedSession: GameSession;
  recordedActions: GameAction[];
}

export class ScoreService {
  /**
   * Apply point addition or deduction to a specific team
   */
  public static modifyPoints(
    session: GameSession,
    teamId: string,
    amount: number,
    type: GameAction['type'],
    description: string,
    questionId?: string,
    questionNumber?: number
  ): ScoreMutationResult {
    let targetTeamName = '';

    const updatedTeams = session.teams.map((t) => {
      if (t.id === teamId) {
        targetTeamName = t.name;
        // User mandate: Points MUST become negative if deducted below 0. NEVER cap at 0!
        const newScore = t.score + amount;
        return {
          ...t,
          score: newScore,
          lastScoreChange: amount,
        };
      }
      return t;
    });

    const previousScore = session.teams.find((t) => t.id === teamId)?.score ?? 0;
    const newScore = updatedTeams.find((t) => t.id === teamId)?.score ?? 0;

    const action: GameAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sessionId: session.id,
      type,
      teamId,
      teamName: targetTeamName || 'Team',
      amount,
      previousScore,
      newScore,
      description,
      questionId,
      questionNumber,
      timestamp: Date.now(),
    };

    return {
      updatedSession: {
        ...session,
        teams: updatedTeams,
        updatedAt: Date.now(),
      },
      recordedActions: [action],
    };
  }

  /**
   * Steal points: Source team gains, Target team loses
   */
  public static stealPoints(
    session: GameSession,
    sourceTeamId: string,
    targetTeamId: string,
    amount: number
  ): ScoreMutationResult {
    const sourceTeam = session.teams.find((t) => t.id === sourceTeamId);
    const targetTeam = session.teams.find((t) => t.id === targetTeamId);

    if (!sourceTeam || !targetTeam) {
      return { updatedSession: session, recordedActions: [] };
    }

    // Steal points: Source team gains full amount, Target team loses full amount.
    // Subtracts correctly even if result is negative; never caps at 0 (e.g. 15 - 20 = -5)
    const actualStealAmount = amount;
    const targetNewScore = targetTeam.score - actualStealAmount;
    const sourceNewScore = sourceTeam.score + actualStealAmount;

    const updatedTeams = session.teams.map((t) => {
      if (t.id === sourceTeamId) {
        return {
          ...t,
          score: sourceNewScore,
          lastScoreChange: actualStealAmount,
        };
      }
      if (t.id === targetTeamId) {
        return {
          ...t,
          score: targetNewScore, // Subtracted correctly into negative numbers, never capped at 0
          lastScoreChange: -actualStealAmount,
        };
      }
      return t;
    });

    const timestamp = Date.now();
    const action: GameAction = {
      id: `act_${timestamp}_steal`,
      sessionId: session.id,
      type: 'steal_points',
      teamId: sourceTeamId,
      teamName: sourceTeam.name,
      targetTeamId: targetTeamId,
      targetTeamName: targetTeam.name,
      amount: actualStealAmount,
      previousScore: sourceTeam.score,
      newScore: sourceNewScore,
      description: `${sourceTeam.name} stole ${actualStealAmount} points from ${targetTeam.name} (${targetTeam.name}: ${targetTeam.score} → ${targetNewScore})`,
      timestamp,
    };

    return {
      updatedSession: {
        ...session,
        teams: updatedTeams,
        updatedAt: timestamp,
      },
      recordedActions: [action],
    };
  }

  /**
   * Swap points between Team A and Team B
   */
  public static swapPoints(
    session: GameSession,
    teamAId: string,
    teamBId: string
  ): ScoreMutationResult {
    const teamA = session.teams.find((t) => t.id === teamAId);
    const teamB = session.teams.find((t) => t.id === teamBId);

    if (!teamA || !teamB) {
      return { updatedSession: session, recordedActions: [] };
    }

    const scoreA = teamA.score;
    const scoreB = teamB.score;

    const updatedTeams = session.teams.map((t) => {
      if (t.id === teamAId) {
        return { ...t, score: scoreB, lastScoreChange: scoreB - scoreA };
      }
      if (t.id === teamBId) {
        return { ...t, score: scoreA, lastScoreChange: scoreA - scoreB };
      }
      return t;
    });

    const timestamp = Date.now();
    const action: GameAction = {
      id: `act_${timestamp}_swap`,
      sessionId: session.id,
      type: 'swap_points',
      teamId: teamAId,
      teamName: teamA.name,
      targetTeamId: teamBId,
      targetTeamName: teamB.name,
      amount: scoreB - scoreA,
      previousScore: scoreA,
      newScore: scoreB,
      description: `Swapped scores between ${teamA.name} (${scoreA}) and ${teamB.name} (${scoreB})`,
      timestamp,
    };

    return {
      updatedSession: {
        ...session,
        teams: updatedTeams,
        updatedAt: timestamp,
      },
      recordedActions: [action],
    };
  }

  /**
   * Reset team score to zero
   */
  public static resetScore(session: GameSession, teamId: string): ScoreMutationResult {
    const targetTeam = session.teams.find((t) => t.id === teamId);
    if (!targetTeam) return { updatedSession: session, recordedActions: [] };

    const prevScore = targetTeam.score;
    const updatedTeams = session.teams.map((t) => {
      if (t.id === teamId) {
        return { ...t, score: 0, lastScoreChange: -prevScore };
      }
      return t;
    });

    const timestamp = Date.now();
    const action: GameAction = {
      id: `act_${timestamp}_reset`,
      sessionId: session.id,
      type: 'reset_score',
      teamId,
      teamName: targetTeam.name,
      amount: -prevScore,
      previousScore: prevScore,
      newScore: 0,
      description: `Reset ${targetTeam.name} score from ${prevScore} to 0`,
      timestamp,
    };

    return {
      updatedSession: {
        ...session,
        teams: updatedTeams,
        updatedAt: timestamp,
      },
      recordedActions: [action],
    };
  }

  /**
   * Undo the last recorded action
   */
  public static undoLastAction(
    session: GameSession,
    lastAction: GameAction
  ): GameSession {
    let updatedTeams = [...session.teams];

    if (lastAction.type === 'swap_points' && lastAction.targetTeamId) {
      // Revert swap: set Team A back to previousScore and Team B back to newScore
      updatedTeams = updatedTeams.map((t) => {
        if (t.id === lastAction.teamId) {
          return { ...t, score: lastAction.previousScore };
        }
        if (t.id === lastAction.targetTeamId) {
          return { ...t, score: lastAction.newScore };
        }
        return t;
      });
    } else if (lastAction.type === 'steal_points' && lastAction.targetTeamId) {
      // Revert steal: teamId loses amount, targetTeamId gains amount
      updatedTeams = updatedTeams.map((t) => {
        if (t.id === lastAction.teamId) {
          return { ...t, score: t.score - lastAction.amount };
        }
        if (t.id === lastAction.targetTeamId) {
          return { ...t, score: t.score + lastAction.amount };
        }
        return t;
      });
    } else {
      // Standard point change or reset: revert back to previousScore
      updatedTeams = updatedTeams.map((t) => {
        if (t.id === lastAction.teamId) {
          return { ...t, score: lastAction.previousScore };
        }
        return t;
      });
    }

    // Also if it was a question_score, check if we need to revert answeredQuestionIds
    let answered = session.answeredQuestionIds;
    if (lastAction.questionId && answered.includes(lastAction.questionId)) {
      answered = answered.filter((qId) => qId !== lastAction.questionId);
    }

    return {
      ...session,
      teams: updatedTeams,
      answeredQuestionIds: answered,
      updatedAt: Date.now(),
    };
  }
}
