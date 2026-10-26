import React, { useState, useEffect, useRef } from 'react';
import { Bot, Users, User, RefreshCw, AlertTriangle, Lightbulb, Brain, Undo2, Keyboard, ListOrdered, Copy, Check, LogOut } from 'lucide-react';
import type { RoomMove, PlayerType, AIDifficulty, GameMode, UserProfile, MatchHistoryItem, MoveAnalysis, ChatMessage } from '../types';
import { getAvailableRow, isColumnAvailable, ROWS, COLS } from '../rules';
import { isGameOver as isGameOverState, newGame, playMove, undo, undoTarget } from '../game';
import type { GameState } from '../game';
import { playClick, playChipDrop, playWin, playLoss, playAlert } from '../sound';
import { Lobby } from './Lobby';
import { ChatPanel } from './ChatPanel';
import { useI18n } from '../i18n';
import { useToast } from '../toast';
import { requestAnalysis, requestBestMove } from '../aiClient';

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

const DIFFICULTIES: AIDifficulty[] = ['easy', 'medium', 'hard', 'expert'];

// CyberPoints for beating the AI at each level
const WIN_BONUS: Record<AIDifficulty, number> = { easy: 10, medium: 20, hard: 50, expert: 80 };

interface ConfettiParticle {
  x: number;
  y: number;
  r: number;
  color: string;
  tilt: number;
  tiltAngleIncremental: number;
  tiltAngle: number;
}

const makeConfettiParticle = (width: number, height: number): ConfettiParticle => ({
  x: Math.random() * width,
  y: Math.random() * height - height,
  r: Math.random() * 6 + 4,
  color: `hsl(${Math.random() * 360}, 100%, 50%)`,
  tilt: Math.random() * 10 - 5,
  tiltAngleIncremental: Math.random() * 0.07 + 0.02,
  tiltAngle: 0,
});

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
  const [linkCopied, setLinkCopied] = useState(false);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Bumped on every reset so a pending AI move from an old game is ignored
  const [gameId, setGameId] = useState(0);
  const gameIdRef = useRef(0);

  const moveListRef = useRef<HTMLOListElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiParticles = useRef<ConfettiParticle[]>([]);
  const confettiAnimId = useRef<number | null>(null);

  const isGameOver = isGameOverState(game);
  // Online: stay on the lobby screen (room code, invite link, chat) until the opponent arrives
  const inLobby = gameMode === 'multiplayer' && (!roomCode || !opponent);

  // Canvas Confetti Win Celebration
  const startConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    confettiParticles.current = Array.from({ length: 150 }, () => makeConfettiParticle(canvas.width, canvas.height));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiParticles.current.forEach((p, idx) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (p.r + 2) / 3;
        p.tilt = Math.sin(p.tiltAngle) * 12;

        ctx.beginPath();
        ctx.lineWidth = p.r / 2;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();

        // Recycle particles falling off-screen
        if (p.y > canvas.height) {
          confettiParticles.current[idx] = { ...makeConfettiParticle(canvas.width, canvas.height), y: -20 };
        }
      });
      confettiAnimId.current = requestAnimationFrame(draw);
    };

    draw();
    // Stop on its own so it never runs forever in the background
    setTimeout(stopConfetti, 5000);
  };

  const stopConfetti = () => {
    if (confettiAnimId.current) {
      cancelAnimationFrame(confettiAnimId.current);
      confettiAnimId.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Clean up canvas
  useEffect(() => {
    return () => {
      stopConfetti();
    };
  }, []);

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

  // Keep the newest move visible in the move list
  useEffect(() => {
    const list = moveListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [gameHistory.length]);

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

  const handleCopyInvite = () => {
    if (!roomCode) return;
    playClick();
    void navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?room=${roomCode}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
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

  // Keyboard controls: 1-7 drop, arrows + Enter/Space choose and drop, U undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) return;
      if (!isActive || document.querySelector('.modal-overlay')) return;
      if (inLobby) return;

      if (e.key >= '1' && e.key <= String(COLS)) {
        e.preventDefault();
        handleColumnClick(Number(e.key) - 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.key === 'ArrowLeft' ? -1 : 1;
        setHoveredCol(prev => (((prev ?? Math.floor(COLS / 2) - step) + step + COLS) % COLS));
      } else if ((e.key === 'Enter' || e.key === ' ') && hoveredCol !== null && target?.tagName !== 'BUTTON') {
        e.preventDefault();
        handleColumnClick(hoveredCol);
      } else if (e.key.toLowerCase() === 'u') {
        handleUndo();
      }
    };

    // Re-subscribed every render so the handler always sees the current board
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  // Helper render of Connect Four Grid
  function renderMatchBoard() {
    // Check active skin classes
    const activeSkin = profile.activeSkin;
    let skinClass = 'skin-neon';
    if (activeSkin === 'retro-arcade') skinClass = 'skin-retro';
    if (activeSkin === 'space-obsidian') skinClass = 'skin-obsidian';
    if (activeSkin === 'royal-gold') skinClass = 'skin-gold';

    const isRedTurn = currentPlayer === 'red';

    // Names shown for each colour
    const redPlayer = gameMode === 'multiplayer'
      ? (side === 'red' ? { name: profile.username, avatar: profile.avatar } : { name: opponent?.username || t('player.opponent'), avatar: opponent?.avatar || '🤖' })
      : gameMode === 'local'
      ? { name: t('player.red'), avatar: profile.avatar }
      : { name: profile.username, avatar: profile.avatar };
    const bluePlayer = gameMode === 'multiplayer'
      ? (side === 'yellow' ? { name: profile.username, avatar: profile.avatar } : { name: opponent?.username || t('player.opponent'), avatar: opponent?.avatar || '🤖' })
      : gameMode === 'local'
      ? { name: t('player.blue'), avatar: '👤' }
      : { name: `${t('player.ai')} · ${t(`settings.${difficulty}`)}`, avatar: '🧠' };

    let statusText: string;
    if (winner) {
      if (gameMode === 'local') {
        statusText = winner === 'red' ? t('status.redWins') : t('status.blueWins');
      } else if (gameMode === 'ai') {
        statusText = winner === 'red' ? t('status.youWin') : t('status.aiWins');
      } else {
        statusText = winner === side ? t('status.youWin') : t('status.opponentWins');
      }
    } else if (isDraw) {
      statusText = t('status.draw');
    } else if (gameMode === 'ai') {
      statusText = isRedTurn ? t('status.yourTurn') : t('status.aiThinking');
    } else if (gameMode === 'local') {
      statusText = isRedTurn ? t('status.redTurn') : t('status.blueTurn');
    } else {
      statusText = currentPlayer === side ? t('status.yourTurn') : t('status.opponentTurn');
    }

    const statusTone = isDraw ? 'draw' : (winner ?? currentPlayer);
    const previewCol = canPlayNow && hoveredCol !== null && isColumnAvailable(board, hoveredCol) ? hoveredCol : null;
    const previewRow = previewCol !== null ? getAvailableRow(board, previewCol) : -1;
    const lastMove = gameHistory[gameHistory.length - 1];

    const playerName = (player: PlayerType) => (player === 'red' ? redPlayer.name : bluePlayer.name);

    return (
      <div className="match-layout">

        {/* Playable Connect Four Board area */}
        <div className="board-column">

          <div className={`c4-board-wrapper ${canPlayNow ? '' : 'board-waiting'}`}>
            <div className={`c4-board ${skinClass}`} onMouseLeave={() => setHoveredCol(null)}>

              {/* Column buttons: hover/focus target and screen-reader control */}
              {Array(COLS).fill(null).map((_, c) => (
                <button
                  key={`indicator-${c}`}
                  className={`column-indicator ${hoveredCol === c ? 'is-active' : ''} ${hintColumn === c ? 'is-hint' : ''}`}
                  style={{
                    gridColumn: c + 1,
                    '--indicator-color': hintColumn === c
                      ? 'var(--accent-green)'
                      : isRedTurn
                      ? 'var(--accent-pink)'
                      : 'var(--accent-cyan)'
                  } as React.CSSProperties}
                  onClick={() => handleColumnClick(c)}
                  onMouseEnter={() => setHoveredCol(c)}
                  onFocus={() => setHoveredCol(c)}
                  aria-label={t('moves.column', { col: c + 1 })}
                  disabled={!isColumnAvailable(board, c)}
                >
                  <span className="column-number">{c + 1}</span>
                  <div className="column-indicator-circle" />
                </button>
              ))}

              {/* Renders cells 6 rows, 7 cols */}
              {Array(ROWS).fill(null).map((_, r) => (
                Array(COLS).fill(null).map((_, c) => {
                  const cell = board[r][c];
                  const isWinning = winningCells.some(([wr, wc]) => wr === r && wc === c);
                  const isLast = lastMove && !isGameOver && getAvailableRow(lastMove.boardBefore, lastMove.column) === r && lastMove.column === c;
                  const isPreview = previewCol === c && previewRow === r;

                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`c4-cell ${isWinning ? 'winning-cell' : ''} ${hoveredCol === c ? 'c4-col-hovered' : ''} ${isGameOver && !isWinning && winner ? 'dimmed' : ''}`}
                      style={{ gridRow: r + 2, gridColumn: c + 1 }}
                      onClick={() => handleColumnClick(c)}
                      onMouseEnter={() => setHoveredCol(c)}
                    >
                      {cell && (
                        <div
                          className={`c4-token ${cell} ${isLast ? 'last-move' : ''}`}
                          style={{ '--drop-row': r } as React.CSSProperties}
                        />
                      )}
                      {!cell && isPreview && <div className={`c4-token ghost ${currentPlayer}`} />}
                    </div>
                  );
                })
              ))}

            </div>
          </div>

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
              <button
                className="glass-button"
                onClick={handleUndo}
                disabled={!canUndo}
                title={t('controls.undoTitle')}
              >
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

        {/* Right Side: status, settings, move list */}
        <div className="side-column">

          {/* Online room info stays visible during the game */}
          {gameMode === 'multiplayer' && roomCode && (
            <section className="glass-panel room-card">
              <div>
                <span className="panel-label">{t('lobby.room')}</span>
                <strong className="room-code">{roomCode}</strong>
              </div>
              <div className="room-actions">
                <button className="glass-button" onClick={handleCopyInvite} title={t('lobby.copy')} aria-label={t('lobby.copy')}>
                  {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <button className="glass-button" onClick={onLeaveLobby} title={t('lobby.leave')} aria-label={t('lobby.leave')}>
                  <LogOut size={14} />
                </button>
              </div>
            </section>
          )}

          {/* Turn status Card */}
          <section className={`status-card glass-panel tone-${statusTone}`} aria-live="polite">
            <span className="panel-label">{t('status.label')}</span>
            <h2 className="status-title display-font">
              {statusText}
              {isAiThinking && <span className="thinking-dots" aria-hidden="true"><i /><i /><i /></span>}
            </h2>

            <div className="player-cards">
              {([['red', redPlayer], ['yellow', bluePlayer]] as const).map(([color, player]) => {
                const active = !isGameOver && currentPlayer === color;
                const won = winner === color;
                return (
                  <div key={color} className={`player-card ${color} ${active ? 'active' : ''} ${won ? 'won' : ''}`}>
                    <span className="player-avatar">{player.avatar}</span>
                    <span className="player-name">{player.name}</span>
                    <span className={`player-chip-dot ${color}`} />
                  </div>
                );
              })}
            </div>
          </section>

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

          {/* AI settings */}
          {gameMode === 'ai' && (
            <section className="glass-panel settings-card">
              <span className="panel-label">{t('settings.difficulty')}</span>
              <div className="segmented">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => { playClick(); setDifficulty(d); resetLocalGame(); }}
                    className={difficulty === d ? 'selected' : ''}
                    aria-pressed={difficulty === d}
                  >
                    {t(`settings.${d}`)}
                  </button>
                ))}
              </div>

              <span className="panel-label">{t('settings.firstMove')}</span>
              <div className="segmented">
                {([false, true] as const).map((value) => (
                  <button
                    key={String(value)}
                    onClick={() => { playClick(); setAiFirst(value); resetLocalGame({ aiStarts: value }); }}
                    className={aiFirst === value ? 'selected' : ''}
                    aria-pressed={aiFirst === value}
                  >
                    {value ? t('settings.aiFirst') : t('settings.youFirst')}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Multiplayer Restart request overlays */}
          {gameMode === 'multiplayer' && roomCode && opponentWantsRestart && (
            <section className="glass-panel rematch-card">
              <div>
                <AlertTriangle size={14} />
                <span>{t('mp.opponentRestart')}</span>
              </div>
              <button
                className="glass-button active"
                onClick={() => { playClick(); onSendRestartConfirm(); }}
              >
                {t('mp.acceptRestart')}
              </button>
            </section>
          )}

          {/* Chat stays available during an online game */}
          {gameMode === 'multiplayer' && roomCode && (
            <ChatPanel compact messages={chatHistory} ownName={profile.username} onSend={onSendChatMessage} />
          )}

          {/* Move list */}
          <section className="glass-panel moves-card">
            <span className="panel-label"><ListOrdered size={13} /> {t('moves.title')}</span>
            {gameHistory.length === 0 ? (
              <p className="moves-empty">{t('moves.empty')}</p>
            ) : (
              <ol className="move-list" ref={moveListRef}>
                {gameHistory.map((step, i) => (
                  <li key={i} className={i === gameHistory.length - 1 ? 'latest' : ''}>
                    <span className="move-number">{i + 1}</span>
                    <span className={`player-chip-dot ${step.player}`} />
                    <span className="move-player">{playerName(step.player)}</span>
                    <span className="move-col">{t('moves.column', { col: step.column + 1 })}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

        </div>

      </div>
    );
  }
};
