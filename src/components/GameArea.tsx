import React, { useState, useEffect, useRef } from 'react';
import { Bot, Users, User, RefreshCw, AlertTriangle, Lightbulb, Brain } from 'lucide-react';
import type { BoardType, PlayerType, AIDifficulty, GameMode, UserProfile, MatchHistoryItem, MoveAnalysis, ChatMessage } from '../types';
import {
  createEmptyBoard,
  getAvailableRow,
  isColumnAvailable,
  checkWin,
  isBoardFull,
  getBestMove,
  analyzeMatch,
  ROWS,
  COLS,
} from '../ai';
import { playClick, playChipDrop, playWin, playLoss, playAlert } from '../sound';
import { Lobby } from './Lobby';

interface GameAreaProps {
  profile: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
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
}

export const GameArea: React.FC<GameAreaProps> = ({
  profile,
  onUpdateProfile,
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
}) => {
  // Gameplay States
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [board, setBoard] = useState<BoardType>(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<PlayerType>('red');
  const [winner, setWinner] = useState<PlayerType | null>(null);
  const [winningCells, setWinningCells] = useState<[number, number][]>([]);
  const [isDraw, setIsDraw] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [hintColumn, setHintColumn] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  // Turn History (for Coach post-game evaluation)
  const [gameHistory, setGameHistory] = useState<{
    player: PlayerType;
    column: number;
    boardBefore: BoardType;
    boardAfter: BoardType;
  }[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiParticles = useRef<{
    x: number;
    y: number;
    r: number;
    d: number;
    color: string;
    tilt: number;
    tiltAngleIncremental: number;
    tiltAngle: number;
  }[]>([]);
  const confettiAnimId = useRef<number | null>(null);

  // Sync board state if in WebSocket Multiplayer mode
  // The server handles turns and alerts us of moves made
  // We mirror the server boards here
  useEffect(() => {
    if (gameMode === 'multiplayer' && roomCode) {
      // Game started, reset local board if restarted by server
      // State is managed by server messages arriving
    }
  }, [roomCode]);

  // Canvas Confetti Win Celebration
  const startConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    confettiParticles.current = [];
    for (let i = 0; i < 150; i++) {
      confettiParticles.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * canvas.height,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0
      });
    }

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
          confettiParticles.current[idx] = {
            ...p,
            x: Math.random() * canvas.width,
            y: -20,
            tilt: Math.random() * 10 - 5
          };
        }
      });
      confettiAnimId.current = requestAnimationFrame(draw);
    };

    draw();
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
    if (gameMode !== 'ai' || currentPlayer !== 'yellow' || winner || isDraw || isAiThinking) return;

    setIsAiThinking(true);
    // Add artificial cyber delay to make the AI feel authentic
    const delay = Math.random() * 600 + 400; 

    setTimeout(() => {
      const bestCol = getBestMove(board, difficulty, 'yellow');
      if (bestCol !== -1) {
        executeMove(bestCol, 'yellow');
      }
      setIsAiThinking(false);
    }, delay);
  }, [currentPlayer, gameMode, winner, isDraw]);

  // Execute standard column drop
  const executeMove = (col: number, player: PlayerType) => {
    const row = getAvailableRow(board, col);
    if (row === -1) return;

    // Cache pre-move board state for AI Coach
    const boardBefore = JSON.parse(JSON.stringify(board));

    const updatedBoard = [...board];
    updatedBoard[row] = [...board[row]];
    updatedBoard[row][col] = player;
    setBoard(updatedBoard);

    // Save move to history ledger
    const boardAfter = JSON.parse(JSON.stringify(updatedBoard));
    setGameHistory(prev => [...prev, { player, column: col, boardBefore, boardAfter }]);

    // Play synthesized drop sound
    playChipDrop(row);

    // Reset hints
    setHintColumn(null);

    // Check rules
    const winResult = checkWin(updatedBoard);
    if (winResult.winner) {
      setWinner(winResult.winner);
      setWinningCells(winResult.cells);
      handleGameEnd(winResult.winner);
    } else if (isBoardFull(updatedBoard)) {
      setIsDraw(true);
      handleGameEnd(null);
    } else {
      // Alternate turns
      setCurrentPlayer(player === 'red' ? 'yellow' : 'red');
    }
  };

  // Connect Four game-over reward system
  const handleGameEnd = (gameWinner: PlayerType | null) => {
    if (gameWinner) {
      if (gameMode === 'local') {
        playWin();
      } else if (gameMode === 'ai') {
        if (gameWinner === 'red') {
          // Won vs AI
          playWin();
          startConfetti();
          const bonus = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 50;
          onUpdateProfile({ 
            points: profile.points + bonus,
            stats: { ...profile.stats, wins: profile.stats.wins + 1 }
          });
          onAddMatchHistory({
            id: Date.now().toString(),
            date: new Date().toLocaleDateString(),
            opponent: `ИИ / AI (${difficulty})`,
            mode: 'ai',
            difficulty,
            result: 'win',
            pointsEarned: bonus
          });
        } else {
          // Lost vs AI
          playLoss();
          onUpdateProfile({
            points: profile.points + 5, // Consolidation points
            stats: { ...profile.stats, losses: profile.stats.losses + 1 }
          });
          onAddMatchHistory({
            id: Date.now().toString(),
            date: new Date().toLocaleDateString(),
            opponent: `ИИ / AI (${difficulty})`,
            mode: 'ai',
            difficulty,
            result: 'loss',
            pointsEarned: 5
          });
        }
      } else if (gameMode === 'multiplayer') {
        const isMyWin = (side === 'red' && gameWinner === 'red') || (side === 'yellow' && gameWinner === 'yellow');
        if (isMyWin) {
          playWin();
          startConfetti();
          onUpdateProfile({ 
            points: profile.points + 40,
            stats: { ...profile.stats, wins: profile.stats.wins + 1 }
          });
          onAddMatchHistory({
            id: Date.now().toString(),
            date: new Date().toLocaleDateString(),
            opponent: opponent?.username || 'Сетевой боец',
            mode: 'multiplayer',
            result: 'win',
            pointsEarned: 40
          });
        } else {
          playLoss();
          onUpdateProfile({
            points: profile.points + 10,
            stats: { ...profile.stats, losses: profile.stats.losses + 1 }
          });
          onAddMatchHistory({
            id: Date.now().toString(),
            date: new Date().toLocaleDateString(),
            opponent: opponent?.username || 'Сетевой боец',
            mode: 'multiplayer',
            result: 'loss',
            pointsEarned: 10
          });
        }
      }
    } else {
      // Draw outcome
      playAlert();
      onUpdateProfile({ 
        points: profile.points + 8,
        stats: { ...profile.stats, draws: profile.stats.draws + 1 }
      });
      onAddMatchHistory({
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
        opponent: gameMode === 'ai' ? `ИИ / AI (${difficulty})` : gameMode === 'local' ? 'Локальный' : (opponent?.username || 'Сетевой боец'),
        mode: gameMode,
        result: 'draw',
        pointsEarned: 8
      });
    }
  };

  // User click on a column
  const handleColumnClick = (col: number) => {
    if (winner || isDraw || isAiThinking) return;

    // In local or AI mode, check if column is available
    if (gameMode !== 'multiplayer') {
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
            // Apply move made by either me or opponent
            const { column, player } = data;
            const row = getAvailableRow(board, column);
            
            if (row !== -1) {
              const boardBefore = JSON.parse(JSON.stringify(board));
              const updatedBoard = [...board];
              updatedBoard[row] = [...board[row]];
              updatedBoard[row][column] = player;
              setBoard(updatedBoard);

              const boardAfter = JSON.parse(JSON.stringify(updatedBoard));
              setGameHistory(prev => [...prev, { player, column, boardBefore, boardAfter }]);

              playChipDrop(row);

              // Check rules on client sync
              const winResult = checkWin(updatedBoard);
              if (winResult.winner) {
                setWinner(winResult.winner);
                setWinningCells(winResult.cells);
                handleGameEnd(winResult.winner);
              } else if (isBoardFull(updatedBoard)) {
                setIsDraw(true);
                handleGameEnd(null);
              } else {
                // Alternate turn based on server instructions
                setCurrentPlayer(player === 'red' ? 'yellow' : 'red');
              }
            }
          } else if (data.type === 'game_restarted') {
            resetLocalGame();
            setCurrentPlayer('red');
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
  }, [socket, board, gameMode, side]);

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

  const resetLocalGame = () => {
    stopConfetti();
    setBoard(createEmptyBoard());
    setCurrentPlayer('red');
    setWinner(null);
    setWinningCells([]);
    setIsDraw(false);
    setGameHistory([]);
    setHintColumn(null);
  };

  // Minimax tactical Hint
  const handleGetHint = () => {
    if (winner || isDraw || isAiThinking) return;

    if (!profile.isPro) {
      if (profile.points < 15) {
        alert('Недостаточно CyberPoints! Подсказка стоит 15 CP или перейдите на PRO.');
        return;
      }
      playClick();
      // Deduct CP points for non-pro hints
      onUpdateProfile({ points: profile.points - 15 });
    } else {
      playClick();
    }

    // Call minimax at max depth
    const bestMove = getBestMove(board, 'hard', currentPlayer);
    setHintColumn(bestMove);
    setTimeout(() => {
      setHintColumn(null);
    }, 4000); // hint disappears after 4 seconds
  };

  // Launch AI Coach commentary timeline
  const handleOpenCoachPanel = () => {
    playClick();
    stopConfetti();
    const matchEvaluations = analyzeMatch(gameHistory, profile.isPro);
    onOpenCoach(matchEvaluations);
  };

  return (
    <div style={{ padding: '0 20px 40px', position: 'relative' }}>
      
      {/* Confetti overlay */}
      <canvas ref={canvasRef} className="confetti-canvas" />

      {/* Mode Switches */}
      <div className="glass-panel" style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '8px',
        maxWidth: '520px',
        margin: '0 auto 25px',
        gap: '8px'
      }}>
        <button
          className={`glass-button ${gameMode === 'ai' ? 'active' : ''}`}
          onClick={() => { playClick(); setGameMode('ai'); resetLocalGame(); }}
          style={{ flex: 1, fontSize: '0.75rem', padding: '10px' }}
        >
          <Bot size={14} />
          <span>vs ИИ</span>
        </button>
        <button
          className={`glass-button ${gameMode === 'local' ? 'active' : ''}`}
          onClick={() => { playClick(); setGameMode('local'); resetLocalGame(); }}
          style={{ flex: 1, fontSize: '0.75rem', padding: '10px' }}
        >
          <User size={14} />
          <span>Локально</span>
        </button>
        <button
          className={`glass-button ${gameMode === 'multiplayer' ? 'active' : ''}`}
          onClick={() => { playClick(); setGameMode('multiplayer'); resetLocalGame(); }}
          style={{ flex: 1, fontSize: '0.75rem', padding: '10px' }}
        >
          <Users size={14} />
          <span>Сеть (1v1)</span>
        </button>
      </div>

      {gameMode === 'multiplayer' ? (
        /* Render WebSocket Multiplayer Lobby manager if in multiplayer mode and lobby is inactive */
        !roomCode ? (
          <Lobby
            profile={profile}
            roomCode={roomCode}
            side={side}
            opponent={opponent}
            chatHistory={chatHistory}
            onConnectWebSocket={onConnectWebSocket}
            onSendChatMessage={onSendChatMessage}
            onLeaveLobby={onLeaveLobby}
          />
        ) : (
          /* Render Active multiplayer match board interface */
          renderMatchBoard()
        )
      ) : (
        /* Local & AI boards */
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

    // Active color indicators
    const isRedTurn = currentPlayer === 'red';
    
    // Status text (in Russian and English)
    let statusText: string;
    if (winner) {
      if (gameMode === 'local') {
        statusText = winner === 'red' ? 'ПОБЕДИЛИ КРАСНЫЕ! / RED WINS!' : 'ПОБЕДИЛИ СИНИЕ! / BLUE WINS!';
      } else if (gameMode === 'ai') {
        statusText = winner === 'red' ? 'ВЫ ВЫИГРАЛИ! / YOU WIN!' : 'ИИ ВЫИГРАЛ! / AI WINS!';
      } else {
        const isMyWin = (side === 'red' && winner === 'red') || (side === 'yellow' && winner === 'yellow');
        statusText = isMyWin ? 'ВЫ ВЫИГРАЛИ! / YOU WIN!' : 'ОППОНЕНТ ВЫИГРАЛ! / OPPONENT WINS!';
      }
    } else if (isDraw) {
      statusText = 'НИЧЬЯ / DRAW!';
    } else if (gameMode === 'ai') {
      statusText = isRedTurn ? 'ВАШ ХОД / YOUR TURN' : 'ИИ ДУМАЕТ... / AI ANALYSIS...';
    } else if (gameMode === 'local') {
      statusText = isRedTurn ? 'ХОД КРАСНЫХ / RED TURN' : 'ХОД СИНИХ / BLUE TURN';
    } else {
      const isMyTurn = currentPlayer === side;
      statusText = isMyTurn ? 'ВАШ ХОД / YOUR TURN' : 'ХОД СОПЕРНИКА / OPPONENT TURN';
    }

    return (
      <div className="match-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '30px', maxWidth: '950px', margin: '0 auto', flexWrap: 'wrap' }}>
        
        {/* Playable Connect Four Board area */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* Main game board */}
          <div className="c4-board-wrapper">
            <div className={`c4-board ${skinClass}`}>
              
              {/* Point hover indicators for each of 7 columns */}
              {Array(COLS).fill(null).map((_, c) => (
                <div
                  key={`indicator-${c}`}
                  className="column-indicator"
                  style={{
                    gridColumn: c + 1,
                    // If AI recommends, point hint green, otherwise pink/cyan based on current turn
                    '--indicator-color': hintColumn === c 
                      ? 'var(--accent-green)' 
                      : isRedTurn 
                      ? 'var(--accent-pink)' 
                      : 'var(--accent-cyan)'
                  } as React.CSSProperties}
                >
                  <div className="column-indicator-circle" style={{
                    opacity: hoveredCol === c || hintColumn === c ? 1 : 0,
                    // AI Hint flashes green brightly
                    border: hintColumn === c ? '3px solid var(--accent-green)' : undefined,
                    boxShadow: hintColumn === c ? '0 0 15px var(--accent-green)' : undefined,
                  }} />
                </div>
              ))}

              {/* Renders cells 6 rows, 7 cols */}
              {Array(ROWS).fill(null).map((_, r) => (
                Array(COLS).fill(null).map((_, c) => {
                  const cell = board[r][c];
                  const isWinning = winningCells.some(([wr, wc]) => wr === r && wc === c);
                  
                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`c4-cell ${isWinning ? 'winning-cell' : ''} ${hoveredCol === c ? 'c4-col-hovered' : ''}`}
                      style={{ gridRow: r + 2, gridColumn: c + 1 }}
                      onClick={() => handleColumnClick(c)}
                      onMouseEnter={() => setHoveredCol(c)}
                      onMouseLeave={() => setHoveredCol(null)}
                    >
                      {cell && (
                        <div
                          className={`c4-token ${cell}`}
                          style={{
                            '--drop-row': r // dynamic bounce landing height
                          } as React.CSSProperties}
                        />
                      )}
                    </div>
                  );
                })
              ))}

            </div>
          </div>

          {/* Prompt options: Hint, restart */}
          <div style={{ display: 'flex', gap: '15px', marginTop: '10px', width: '100%', justifyContent: 'center' }}>
            <button
              className="glass-button"
              onClick={handleGetHint}
              disabled={!!winner || isDraw || isAiThinking}
              style={{
                borderColor: 'rgba(57, 255, 20, 0.3)',
                boxShadow: hintColumn !== null ? '0 0 10px var(--accent-green)' : 'none'
              }}
              title={profile.isPro ? 'Получить бесплатную ИИ-подсказку' : 'Подсказка ИИ (стоит 15 CP)'}
            >
              <Lightbulb size={16} className="neon-text-cyan" style={{ color: 'var(--accent-green)', filter: 'drop-shadow(0 0 3px rgba(57,255,20,0.5))' }} />
              <span className="display-font" style={{ fontSize: '0.8rem', color: 'var(--accent-green)' }}>
                {profile.isPro ? 'Подсказка / Hint' : 'Подсказка (15 CP)'}
              </span>
            </button>

            <button
              className="glass-button"
              onClick={handleRestart}
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <RefreshCw size={14} />
              <span className="display-font" style={{ fontSize: '0.8rem' }}>Заново</span>
            </button>
          </div>

        </div>

        {/* Right Side: Turn Details & Match commentary log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Turn status Card */}
          <div className="glass-panel" style={{ padding: '25px', textAlign: 'center', minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginBottom: '8px' }}>
              Статус Арены / Arena Ledger
            </span>
            <h2 className="display-font" style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: winner 
                ? (winner === 'red' ? 'var(--accent-pink)' : 'var(--accent-cyan)') 
                : isRedTurn ? 'var(--accent-pink)' : 'var(--accent-cyan)',
              textShadow: winner 
                ? (winner === 'red' ? 'var(--glow-pink)' : 'var(--glow-cyan)') 
                : isRedTurn ? 'var(--glow-pink)' : 'var(--glow-cyan)',
              marginBottom: '15px'
            }}>
              {statusText}
            </h2>

            {/* Glowing avatar turns */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', alignItems: 'center' }}>
              <div style={{
                width: '50px', height: '50px', borderRadius: '50%',
                background: 'rgba(255,0,127,0.1)', border: isRedTurn ? '2px solid var(--accent-pink)' : '1px solid rgba(255,255,255,0.05)',
                boxShadow: isRedTurn ? 'var(--glow-pink)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem',
                transform: isRedTurn ? 'scale(1.15)' : 'scale(0.95)', transition: 'all 0.25s'
              }}>
                {gameMode === 'multiplayer' 
                  ? (side === 'red' ? profile.avatar : (opponent?.avatar || '🤖')) 
                  : profile.avatar}
              </div>

              <span className="display-font" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>VS</span>

              <div style={{
                width: '50px', height: '50px', borderRadius: '50%',
                background: 'rgba(0,240,255,0.1)', border: !isRedTurn ? '2px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.05)',
                boxShadow: !isRedTurn ? 'var(--glow-cyan)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem',
                transform: !isRedTurn ? 'scale(1.15)' : 'scale(0.95)', transition: 'all 0.25s'
              }}>
                {gameMode === 'ai' ? '🤖' : gameMode === 'local' ? '👤' : (side === 'yellow' ? profile.avatar : (opponent?.avatar || '🤖'))}
              </div>
            </div>
          </div>

          {/* AI Coach recommendation popup */}
          {(winner || isDraw) && gameHistory.length > 0 && (
            <div className="glass-panel" style={{
              padding: '20px',
              border: '1px solid var(--accent-cyan)',
              boxShadow: 'var(--glow-cyan)',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(13, 8, 30, 0.6))',
              animation: 'blink-glow 3s infinite',
              textAlign: 'center'
            }}>
              <Brain size={24} style={{ color: 'var(--accent-cyan)', margin: '0 auto 10px' }} />
              <h3 className="display-font" style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                АНАЛИЗ ХОДОВ ИИ-КОУЧЕМ
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '15px', lineHeight: '1.4' }}>
                Партия завершена! Запустите интерактивного Коуча, чтобы разобрать ваши тактические неточности, сильные стороны и блундеры.
              </p>
              <button
                className="glass-button active"
                onClick={handleOpenCoachPanel}
                style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))', borderColor: 'var(--accent-cyan)' }}
              >
                ОТКРЫТЬ АНАЛИЗ / REVIEW
              </button>
            </div>
          )}

          {/* Dynamic AI Difficulties controller */}
          {gameMode === 'ai' && !winner && !isDraw && (
            <div className="glass-panel" style={{ padding: '20px' }}>
              <span className="cyber-label" style={{ fontSize: '0.65rem' }}>Уровень сложности ИИ / AI Difficulty</span>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => { playClick(); setDifficulty(d); resetLocalGame(); }}
                    className={`glass-button ${difficulty === d ? 'active' : ''}`}
                    style={{ flex: 1, fontSize: '0.65rem', padding: '6px 10px' }}
                  >
                    {d === 'easy' ? 'Легко' : d === 'medium' ? 'Средне' : 'Хард'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Multiplayer Restart request overlays */}
          {gameMode === 'multiplayer' && roomCode && opponentWantsRestart && !winner && !isDraw && (
            <div className="glass-panel" style={{ padding: '15px 20px', border: '1px dashed var(--accent-pink)', background: 'rgba(255,0,127,0.05)' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.8rem', marginBottom: '10px' }}>
                <AlertTriangle size={14} className="neon-text-pink" />
                <span>Соперник предлагает начать заново!</span>
              </div>
              <button 
                className="glass-button active pink" 
                onClick={() => { playClick(); onSendRestartConfirm(); }}
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem' }}
              >
                Согласиться / Restart Match
              </button>
            </div>
          )}

        </div>

      </div>
    );
  }
};
