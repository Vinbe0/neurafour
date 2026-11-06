import React, { useState, useEffect, useRef } from 'react';
import { Bot, Users, User, RefreshCw, AlertTriangle, Lightbulb, Brain, Undo2, Keyboard } from 'lucide-react';
import type { RoomMove, PlayerType, AIDifficulty, GameMode, UserProfile, MatchHistoryItem, MoveAnalysis, ChatMessage } from '../types';
import { isColumnAvailable } from '../rules';
import { isGameOver as isGameOverState, newGame, playMove, undo, undoTarget } from '../game';
import type { GameState } from '../game';
import { playClick, playChipDrop, playWin, playLoss, playAlert } from '../sound';
import { Lobby } from './Lobby';
import { ChatPanel } from './ChatPanel';
import { useI18n } from '../i18n';
import { useToast } from '../toast';
import { requestAnalysis, requestBestMove } from '../aiClient';
import { useConfetti } from '../hooks/useConfetti';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { Board } from './game/Board';
import { StatusCard } from './game/StatusCard';
import type { PlayerLabel } from './game/StatusCard';
import { AISettings } from './game/AISettings';
import { RoomBar } from './game/RoomBar';
import { MoveList } from './game/MoveList';

interface GameAreaProps {
  // False while another screen (the AI Coach) covers the game; keyboard controls pause
  isActive: boolean;
  profile: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onSpendPoints: (item: string, cost: number) => boolean;
  onAddMatchHistory: (match: MatchHistoryItem) => void;
  isMuted: boolean;
  onOpenPro: () => void;
  onOpenCoach: (analyses: MoveAnalysis[]) => void;
  // Socket parameters passed from App.tsx
  roomCode: string | null;
  side: 'red' | 'yellow' | null;
  opponent: { username: string; avatar: string } | null;
  chatHistory: ChatMessage[];
  socket: WebSocket | null;
  onConnectWebSocket: (roomCode: string | null, action: 'create' | 'join') => void;
  onSendChatMessage: (text: string) => void;
  onLeaveLobby: () => void;
  onSendMove: (col: number) => void;
  onSendRestart: () => void;
  onSendRestartConfirm: () => void;
  opponentWantsRestart: boolean;
  connectionError: string | null;
  // Set after a page reload: the online game so far, to rebuild the board from
  restoredMoves: RoomMove[] | null;
}

// CyberPoints for beating the AI at each level
const WIN_BONUS: Record<AIDifficulty, number> = { easy: 10, medium: 20, hard: 50, expert: 80 };

export const GameArea: React.FC<GameAreaProps> = ({
  isActive,
  profile,
  onUpdateProfile,
  onSpendPoints,
  onAddMatchHistory,
  onOpenCoach,
  roomCode,
  side,
  opponent,
  chatHistory,
  socket,
  onConnectWebSocket,
  onSendChatMessage,
  onLeaveLobby,
  onSendMove,
  onSendRestart,
  onSendRestartConfirm,
  opponentWantsRestart,
  connectionError,
  restoredMoves,
}) => {
  const { t } = useI18n();
  const notify = useToast();

  // Gameplay States
  // Invite links (?room=CODE) open straight into online mode
  const [gameMode, setGameMode] = useState<GameMode>(() => (new URLSearchParams(window.location.search).has('room') ? 'multiplayer' : 'ai'));
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [aiFirst, setAiFirst] = useState(false);
  // Board, turn, result and move history; changed only through the functions in game.ts
  const [game, setGame] = useState<GameState>(() => newGame());
  const { board, currentPlayer, winner, winningCells, isDraw, history: gameHistory } = game;
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [hintColumn, setHintColumn] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Bumped on every reset so a pending AI move from an old game is ignored
  const [gameId, setGameId] = useState(0);
  const gameIdRef = useRef(0);

  const { canvasRef, start: startConfetti, stop: stopConfetti } = useConfetti();

  const isGameOver = isGameOverState(game);
  // Online: stay on the lobby screen (room code, invite link, chat) until the opponent arrives
  const inLobby = gameMode === 'multiplayer' && (!roomCode || !opponent);

  // AI Turn Execution
  useEffect(() => {
    if (gameMode !== 'ai' || currentPlayer !== 'yellow' || winner || isDraw) return;

    const startedIn = gameIdRef.current;
    let cancelled = false;
    setIsAiThinking(true);
    // Search in the worker, but wait at least a short moment so the AI move is easy to follow
    const minDelay = new Promise((resolve) => setTimeout(resolve, Math.random() * 500 + 350));

    void Promise.all([requestBestMove(board, difficulty, 'yellow'), minDelay]).then(([bestCol]) => {
      if (cancelled || startedIn !== gameIdRef.current) return;
      if (bestCol !== -1) {
        executeMove(bestCol, 'yellow');
      }
      setIsAiThinking(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, gameMode, winner, isDraw, gameId]);

  // Rejoined an online game after a reload: switch to online mode and replay its moves
  useEffect(() => {
    if (!restoredMoves) return;
    setGameMode('multiplayer');
    let state = newGame();
    for (const { column, player } of restoredMoves) {
      state = playMove(state, column, player)?.state ?? state;
    }
    setGame(state);
  }, [restoredMoves]);

  // Execute standard column drop
  const executeMove = (col: number, player: PlayerType) => {
    const outcome = playMove(game, col, player);
    if (!outcome) return;

    setGame(outcome.state);
    playChipDrop(outcome.row);
    setHintColumn(null);

    if (outcome.state.winner) {
      handleGameEnd(outcome.state.winner);
    } else if (outcome.state.isDraw) {
      handleGameEnd(null);
    }
  };

  const recordMatch = (result: MatchHistoryItem['result'], pointsEarned: number, opponentName: string) => {
    const statKey = result === 'win' ? 'wins' : result === 'loss' ? 'losses' : 'draws';
    onUpdateProfile({
      points: profile.points + pointsEarned,
      stats: { ...profile.stats, [statKey]: profile.stats[statKey] + 1 },
    });
    onAddMatchHistory({
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      opponent: opponentName,
      mode: gameMode,
      difficulty: gameMode === 'ai' ? difficulty : undefined,
      result,
      pointsEarned,
    });
  };

  // Connect Four game-over reward system
  const handleGameEnd = (gameWinner: PlayerType | null) => {
    const aiName = `AI (${difficulty})`;
    const onlineName = opponent?.username || t('player.opponent');

    // Two players on one screen: no points, so the leaderboard cannot be farmed
    if (gameMode === 'local') {
      if (gameWinner) playWin();
      else playAlert();
      return;
    }

    if (!gameWinner) {
      playAlert();
      recordMatch('draw', 8, gameMode === 'ai' ? aiName : onlineName);
      return;
    }

    const isMyWin = gameMode === 'ai' ? gameWinner === 'red' : gameWinner === side;
    if (isMyWin) {
      playWin();
      startConfetti();
      const bonus = gameMode === 'multiplayer' ? 40 : WIN_BONUS[difficulty];
      recordMatch('win', bonus, gameMode === 'ai' ? aiName : onlineName);
    } else {
      playLoss();
      // Consolation points
      recordMatch('loss', gameMode === 'multiplayer' ? 10 : 5, gameMode === 'ai' ? aiName : onlineName);
    }
  };

  // User click on a column
  const handleColumnClick = (col: number) => {
    if (isGameOver || isAiThinking) return;

    if (gameMode !== 'multiplayer') {
      if (gameMode === 'ai' && currentPlayer !== 'red') return;
      if (!isColumnAvailable(board, col)) {
        playAlert();
        return;
      }
      executeMove(col, currentPlayer);
    } else {
      // WebSocket Multiplayer Mode
      if (currentPlayer !== side) return; // Not your turn
      if (!isColumnAvailable(board, col)) return;
      onSendMove(col); // Broadcast move to server
    }
  };

  // Listen to WebSocket server messages specifically for board syncs
  useEffect(() => {
    if (socket && gameMode === 'multiplayer') {
      const handleServerMessage = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);

          if (data.type === 'move_made') {
            // Apply the move the server accepted, made by either me or the opponent
            executeMove(data.column, data.player);
          } else if (data.type === 'game_restarted') {
            resetLocalGame();
          }
        } catch (err) {
          console.error(err);
        }
      };

      socket.addEventListener('message', handleServerMessage);
      return () => {
        socket.removeEventListener('message', handleServerMessage);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, game, gameMode, side]);

  // Restart match logic
  const handleRestart = () => {
    playClick();
    if (gameMode !== 'multiplayer') {
      resetLocalGame();
    } else {
      // Sends restart vote request to websocket opponent
      onSendRestart();
    }
  };

  const resetLocalGame = (options: { mode?: GameMode; aiStarts?: boolean } = {}) => {
    const mode = options.mode ?? gameMode;
    const aiStarts = options.aiStarts ?? aiFirst;
    stopConfetti();
    gameIdRef.current += 1;
    setGameId(gameIdRef.current);
    setGame(newGame(mode === 'ai' && aiStarts ? 'yellow' : 'red'));
    setIsAiThinking(false);
    setHintColumn(null);
  };

  const changeMode = (mode: GameMode) => {
    playClick();
    setGameMode(mode);
    resetLocalGame({ mode });
  };

  // Undo: vs AI rewinds to before your last move (and the AI's reply), locally it removes one move
  const canUndo = !isAiThinking && undoTarget(game, gameMode) !== -1;

  const handleUndo = () => {
    if (!canUndo) return;
    playClick();
    setGame(undo(game, gameMode));
    setHintColumn(null);
  };

  // Minimax tactical Hint
  const handleGetHint = async () => {
    if (isGameOver || isAiThinking || isHintLoading) return;

    if (!profile.isPro) {
      if (profile.points < 15) {
        notify(t('controls.notEnoughHint'), 'error');
        return;
      }
      playClick();
      // Non-PRO hints cost 15 CP
      onSpendPoints('hint', 15);
    } else {
      playClick();
    }

    // Ask the engine (in the worker) what Hard would play here
    const startedIn = gameIdRef.current;
    setIsHintLoading(true);
    const bestMove = await requestBestMove(board, 'hard', currentPlayer);
    setIsHintLoading(false);
    if (startedIn !== gameIdRef.current) return;
    setHintColumn(bestMove);
    setTimeout(() => {
      setHintColumn(null);
    }, 4000); // hint disappears after 4 seconds
  };

  // Launch AI Coach commentary timeline
  const handleOpenCoachPanel = async () => {
    if (isAnalyzing) return;
    playClick();
    stopConfetti();
    setIsAnalyzing(true);
    const matchEvaluations = await requestAnalysis(gameHistory, profile.isPro);
    setIsAnalyzing(false);
    onOpenCoach(matchEvaluations);
  };

  const canPlayNow = !isGameOver && !isAiThinking
    && (gameMode === 'local' || (gameMode === 'ai' && currentPlayer === 'red') || (gameMode === 'multiplayer' && !!roomCode && currentPlayer === side));

  useKeyboardControls({
    enabled: isActive && !inLobby,
    selectedColumn: hoveredCol,
    onSelect: setHoveredCol,
    onPlay: handleColumnClick,
    onUndo: handleUndo,
  });

  return (
    <div className="game-page">

      {/* Confetti overlay */}
      <canvas ref={canvasRef} className="confetti-canvas" />

      {/* Mode Switches */}
      <div className="mode-switch glass-panel" role="tablist">
        {([
          ['ai', <Bot size={15} key="ai" />, t('mode.ai')],
          ['local', <User size={15} key="local" />, t('mode.local')],
          ['multiplayer', <Users size={15} key="mp" />, t('mode.online')],
        ] as const).map(([mode, icon, label]) => (
          <button
            key={mode}
            role="tab"
            aria-selected={gameMode === mode}
            className={`glass-button ${gameMode === mode ? 'active' : ''}`}
            onClick={() => changeMode(mode)}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {inLobby ? (
        <Lobby
          profile={profile}
          roomCode={roomCode}
          side={side}
          opponent={opponent}
          chatHistory={chatHistory}
          onConnectWebSocket={onConnectWebSocket}
          onSendChatMessage={onSendChatMessage}
          onLeaveLobby={onLeaveLobby}
          connectionError={connectionError}
        />
      ) : (
        renderMatchBoard()
      )}
    </div>
  );

  // Names shown for each colour
  function playerLabels(): Record<PlayerType, PlayerLabel> {
    const me = { name: profile.username, avatar: profile.avatar };
    const them = { name: opponent?.username || t('player.opponent'), avatar: opponent?.avatar || '🤖' };
    if (gameMode === 'multiplayer') return side === 'red' ? { red: me, yellow: them } : { red: them, yellow: me };
    if (gameMode === 'local') return { red: { name: t('player.red'), avatar: profile.avatar }, yellow: { name: t('player.blue'), avatar: '👤' } };
    return { red: me, yellow: { name: `${t('player.ai')} · ${t(`settings.${difficulty}`)}`, avatar: '🧠' } };
  }

  function statusText(): string {
    if (winner) {
      if (gameMode === 'local') return winner === 'red' ? t('status.redWins') : t('status.blueWins');
      if (gameMode === 'ai') return winner === 'red' ? t('status.youWin') : t('status.aiWins');
      return winner === side ? t('status.youWin') : t('status.opponentWins');
    }
    if (isDraw) return t('status.draw');
    if (gameMode === 'ai') return currentPlayer === 'red' ? t('status.yourTurn') : t('status.aiThinking');
    if (gameMode === 'local') return currentPlayer === 'red' ? t('status.redTurn') : t('status.blueTurn');
    return currentPlayer === side ? t('status.yourTurn') : t('status.opponentTurn');
  }

  function renderMatchBoard() {
    const players = playerLabels();

    return (
      <div className="match-layout">
        <div className="board-column">
          <Board
            board={board}
            skin={profile.activeSkin}
            currentPlayer={currentPlayer}
            winner={winner}
            winningCells={winningCells}
            isGameOver={isGameOver}
            lastMove={gameHistory[gameHistory.length - 1]}
            canPlay={canPlayNow}
            hoveredColumn={hoveredCol}
            hintColumn={hintColumn}
            onHover={setHoveredCol}
            onColumnClick={handleColumnClick}
          />

          {/* Controls: hint, undo, restart */}
          <div className="board-controls">
            <button
              className="glass-button hint-button"
              onClick={handleGetHint}
              disabled={!canPlayNow}
              title={profile.isPro ? t('controls.hintTitlePro') : t('controls.hintTitle')}
            >
              <Lightbulb size={15} />
              <span>{profile.isPro ? t('controls.hint') : t('controls.hintCost')}</span>
            </button>

            {gameMode !== 'multiplayer' && (
              <button className="glass-button" onClick={handleUndo} disabled={!canUndo} title={t('controls.undoTitle')}>
                <Undo2 size={15} />
                <span>{t('controls.undo')}</span>
              </button>
            )}

            <button className="glass-button" onClick={handleRestart}>
              <RefreshCw size={14} />
              <span>{t('controls.restart')}</span>
            </button>
          </div>

          <p className="keyboard-hint">
            <Keyboard size={13} />
            <span>{t('controls.keyboard')}</span>
          </p>
        </div>

        <div className="side-column">
          {gameMode === 'multiplayer' && roomCode && <RoomBar roomCode={roomCode} onLeave={onLeaveLobby} />}

          <StatusCard
            text={statusText()}
            tone={isDraw ? 'draw' : (winner ?? currentPlayer)}
            isThinking={isAiThinking}
            players={players}
            activePlayer={isGameOver ? null : currentPlayer}
            winner={winner}
          />

          {/* Post-game: AI Coach + play again */}
          {isGameOver && gameHistory.length > 0 && (
            <section className="coach-cta glass-panel">
              <Brain size={22} />
              <h3 className="display-font">{t('coachPrompt.title')}</h3>
              <p>{t('coachPrompt.body')}</p>
              <div className="coach-cta-actions">
                <button className="glass-button active" onClick={handleOpenCoachPanel} disabled={isAnalyzing}>
                  {isAnalyzing ? t('coachPrompt.analyzing') : t('coachPrompt.button')}
                </button>
                <button className="glass-button" onClick={handleRestart}>
                  <RefreshCw size={14} />
                  {t('controls.restart')}
                </button>
              </div>
            </section>
          )}

          {gameMode === 'ai' && (
            <AISettings
              difficulty={difficulty}
              aiFirst={aiFirst}
              onDifficultyChange={(d) => { playClick(); setDifficulty(d); resetLocalGame(); }}
              onFirstMoveChange={(value) => { playClick(); setAiFirst(value); resetLocalGame({ aiStarts: value }); }}
            />
          )}

          {gameMode === 'multiplayer' && roomCode && opponentWantsRestart && (
            <section className="glass-panel rematch-card">
              <div>
                <AlertTriangle size={14} />
                <span>{t('mp.opponentRestart')}</span>
              </div>
              <button className="glass-button active" onClick={() => { playClick(); onSendRestartConfirm(); }}>
                {t('mp.acceptRestart')}
              </button>
            </section>
          )}

          {/* Chat stays available during an online game */}
          {gameMode === 'multiplayer' && roomCode && (
            <ChatPanel compact messages={chatHistory} ownName={profile.username} onSend={onSendChatMessage} />
          )}

          <MoveList history={gameHistory} playerName={(player) => players[player].name} />
        </div>
      </div>
    );
  }
};
