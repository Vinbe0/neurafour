import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, PlayerType, RoomMove } from '../types';
import { playAlert, playClick, playUnlock } from '../sound';
import { useI18n } from '../i18n';
import { isErrorCode } from '../protocol';
import { useToast } from '../toast';

// Online play: the WebSocket connection to the multiplayer server, the room this
// tab is in, and the actions the game screen can send.

// The online room this tab is in, kept for the session so a page reload can rejoin it
const STORAGE_ROOM_KEY = 'neurafour_room';

interface SavedRoom {
  roomCode: string;
  token: string;
}

const loadSavedRoom = (): SavedRoom | null => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_ROOM_KEY) ?? 'null');
    return saved && typeof saved.roomCode === 'string' && typeof saved.token === 'string' ? saved : null;
  } catch {
    return null;
  }
};

const saveRoom = (room: SavedRoom | null) => {
  try {
    if (room) sessionStorage.setItem(STORAGE_ROOM_KEY, JSON.stringify(room));
    else sessionStorage.removeItem(STORAGE_ROOM_KEY);
  } catch {
    // without storage the game still works, it just cannot be rejoined after a reload
  }
};


export interface Opponent {
  username: string;
  avatar: string;
}

export const useMultiplayer = (player: { username: string; avatar: string }) => {
  const { t } = useI18n();

  // Server errors arrive as a code (e.g. not_your_turn); older servers sent only text
  const serverError = (data: { code?: unknown; message?: string }) =>
    isErrorCode(data.code) ? t(`error.${data.code}`) : data.message ?? t('mp.serverError');
  const notify = useToast();

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [side, setSide] = useState<PlayerType | null>(null);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [opponentWantsRestart, setOpponentWantsRestart] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  // Moves of an online game restored after a page reload, replayed by GameArea
  const [restoredMoves, setRestoredMoves] = useState<RoomMove[] | null>(null);
  const rejoinAttempted = useRef(false);

  const connectWebSocket = (customCode: string | null, action: 'create' | 'join' | 'rejoin') => {
    setConnectionError(null);
    try {
      // Use the hosted server when configured, otherwise the local one on port 5001
      const wsUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:5001`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Connected to NeuraFour multiplayer server');
        
        if (action === 'create') {
          ws.send(JSON.stringify({
            type: 'create_room',
            username: player.username,
            avatar: player.avatar,
          }));
        } else if (action === 'join' && customCode) {
          ws.send(JSON.stringify({
            type: 'join_room',
            roomCode: customCode,
            username: player.username,
            avatar: player.avatar,
          }));
        } else if (action === 'rejoin') {
          const saved = loadSavedRoom();
          if (saved) ws.send(JSON.stringify({ type: 'rejoin_room', ...saved }));
        }
      };

      // Once in a room, server errors (e.g. "not your turn") are shown but do not disconnect
      let inRoom = false;

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);

        switch (data.type) {
          case 'room_created': {
            inRoom = true;
            saveRoom({ roomCode: data.roomCode, token: data.token });
            setRoomCode(data.roomCode);
            setSide('red');
            setChatHistory([]);
            break;
          }

          case 'room_joined': {
            inRoom = true;
            saveRoom({ roomCode: data.roomCode, token: data.token });
            setRoomCode(data.roomCode);
            setSide('yellow');
            setOpponent(data.opponent);
            setChatHistory(data.chatHistory || []);
            break;
          }

          case 'room_rejoined': {
            inRoom = true;
            setRoomCode(data.roomCode);
            setSide(data.side);
            setOpponent(data.opponent);
            setChatHistory(data.chatHistory || []);
            setRestoredMoves(data.moves);
            notify(t('mp.rejoined', { code: data.roomCode }), 'success');
            break;
          }

          case 'opponent_disconnected': {
            playAlert();
            notify(t('mp.opponentDisconnected', { seconds: data.graceSeconds }), 'info');
            break;
          }

          case 'opponent_reconnected': {
            notify(t('mp.opponentReconnected'), 'success');
            break;
          }

          case 'opponent_joined': {
            setOpponent(data.opponent);
            playUnlock(); // sound chime alert
            break;
          }

          case 'opponent_left': {
            playAlert();
            notify(t('mp.opponentLeft'), 'error');
            // Graceful network exit reset
            saveRoom(null);
            resetSocketMatch();
            break;
          }

          case 'chat_received': {
            setChatHistory((prev) => [...prev, data.message]);
            break;
          }

          case 'opponent_wants_restart': {
            setOpponentWantsRestart(true);
            playAlert();
            break;
          }

          case 'game_restarted': {
            setOpponentWantsRestart(false);
            break;
          }

          case 'error': {
            if (action === 'rejoin' && !inRoom) {
              // The saved room has closed meanwhile: forget it quietly
              saveRoom(null);
              ws.close();
              break;
            }
            playAlert();
            notify(serverError(data), 'error');
            if (!inRoom) {
              setConnectionError(serverError(data));
              ws.close();
            }
            break;
          }
        }
      };

      ws.onclose = () => {
        console.log('WebSocket network channel disconnected');
        resetSocketMatch();
      };

      ws.onerror = (err) => {
        console.error('WebSocket encountered an error', err);
        setConnectionError(t('mp.serverError'));
        resetSocketMatch();
      };

      setSocket(ws);
    } catch (e) {
      console.error('Failed to initiate socket connection', e);
      setConnectionError(t('mp.serverError'));
      resetSocketMatch();
    }
  };

  const resetSocketMatch = () => {
    setSocket(null);
    setRoomCode(null);
    setSide(null);
    setOpponent(null);
    setChatHistory([]);
    setOpponentWantsRestart(false);
  };

  const sendChatMessage = (text: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'chat',
        username: player.username,
        avatar: player.avatar,
        text,
      }));
    }
  };

  const sendMove = (col: number) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'make_move',
        column: col,
      }));
    }
  };

  const sendRestartRequest = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'restart_request' }));
      playClick();
      notify(t('mp.restartSent'), 'success');
    }
  };

  const sendRestartConfirm = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'restart_confirm' }));
      setOpponentWantsRestart(false);
      playClick();
    }
  };

  const handleLeaveLobby = () => {
    playClick();
    if (socket) {
      // Tell the server this is on purpose, so it closes the room instead of holding the seat
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'leave_room' }));
      socket.close();
    }
    saveRoom(null);
    resetSocketMatch();
  };

  // After a page reload, rejoin the online game this tab was in
  useEffect(() => {
    if (rejoinAttempted.current || !loadSavedRoom()) return;
    rejoinAttempted.current = true;
    connectWebSocket(null, 'rejoin');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safe window close handler
  useEffect(() => {
    return () => {
      if (socket) socket.close();
    };
  }, [socket]);

  return {
    socket,
    roomCode,
    side,
    opponent,
    chatHistory,
    opponentWantsRestart,
    connectionError,
    restoredMoves,
    connect: connectWebSocket,
    sendChatMessage,
    sendMove,
    sendRestartRequest,
    sendRestartConfirm,
    leave: handleLeaveLobby,
  };
};
