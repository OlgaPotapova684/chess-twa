'use client';
import { useState, useEffect } from "react";
import { Chess } from "chess.js";

export default function TelegramChess() {
  const [mounted, setMounted] = useState(false); // Состояние для исправления ошибки гидратации
  const [game, setGame] = useState(new Chess());
  const [analysis, setAnalysis] = useState("");
  const [statusMessage, setStatusMessage] = useState("Партия началась 🏆");
  const [isThinking, setIsThinking] = useState(false);
  const [pendingMove, setPendingMove] = useState<string | null>(null);
  const [currentOptions, setCurrentOptions] = useState(["e2e4", "d2d4", "g1f3"]);

  useEffect(() => {
    setMounted(true); // Сообщаем React, что мы в браузере
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  // Если мы еще не на клиенте, ничего не рисуем (это уберет ошибку)
  if (!mounted) return null;

  // Остальная логика остается такой же...
  const getStrategicAnalysis = (move: any, fenBefore: string) => {
    const tempGame = new Chess(fenBefore);
    const piece = tempGame.get(move.from);
    let text = `✅ План: Ход ${piece.type.toUpperCase()} на ${move.to}. `;
    if (['e4', 'd4', 'e5', 'd5'].includes(move.to)) text += "Контроль центра. ";
    if (move.captured) text += `Взятие ${move.captured.toUpperCase()}! `;
    text += `\n⚠️ Риск: Ослабление поля ${move.from}.`;
    return text;
  };

  const confirmMove = () => {
    if (!pendingMove) return;
    const moveId = pendingMove;
    const gameCopy = new Chess(game.fen());
    
    try {
      const moveResult = gameCopy.move({ from: moveId.slice(0,2), to: moveId.slice(2,4), promotion: 'q' });
      if (moveResult) {
        setGame(new Chess(gameCopy.fen()));
        setPendingMove(null);
        setAnalysis("");
        setIsThinking(true);
        setStatusMessage("Компьютер думает...");

        if (window.Telegram?.WebApp) window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');

        setTimeout(() => {
          const computerGame = new Chess(gameCopy.fen());
          const moves = computerGame.moves({ verbose: true });
          const captures = moves.filter(m => m.captured);
          
          // ВНИМАНИЕ: Math.random() теперь вызывается только внутри useEffect/событий, что безопасно
          const bestReply = captures.length > 0 ? captures[Math.floor(Math.random() * captures.length)] : moves[Math.floor(Math.random() * moves.length)];

          if (bestReply) computerGame.move(bestReply);

          setGame(new Chess(computerGame.fen()));
          setIsThinking(false);
          setStatusMessage("Ваш следующий шаг?");

          const nextMoves = computerGame.moves({ verbose: true })
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(m => m.from + m.to);
          
          setCurrentOptions(nextMoves);
        }, 2000);
      }
    } catch (e) {
      alert("Ошибка");
    }
  };

  const proposeMove = (moveId: string) => {
    setPendingMove(moveId);
    const gameCopy = new Chess(game.fen());
    try {
      const move = gameCopy.move({ from: moveId.slice(0,2), to: moveId.slice(2,4), dry_run: true });
      setAnalysis(getStrategicAnalysis(move, game.fen()));
      if (window.Telegram?.WebApp) window.Telegram.WebApp.HapticFeedback.selectionChanged();
    } catch {
      setAnalysis("Ход возможен.");
    }
  };

  const board = game.board();
  const pieceUnicode: any = {
    'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',
    'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔',
  };

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', 
      padding: '10px', backgroundColor: '#17212b', minHeight: '100vh', 
      color: '#f5f5f5', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' 
    }}>
      <h3 style={{ color: '#6ab2f2', margin: '10px 0' }}>Шахматный Тренер</h3>
      
      <div style={{ height: '30px', fontSize: '14px', color: '#808d99' }}>{statusMessage}</div>

      <div style={{ padding: '8px', backgroundColor: '#242f3d', borderRadius: '8px', marginTop: '5px' }}>
        <div style={{ border: '1px solid #334155', display: 'grid', gridTemplateColumns: 'repeat(8, 11vw)', maxWidth: '88vw' }}>
          {board.map((row, rIdx) => row.map((cell, cIdx) => (
            <div key={`${rIdx}-${cIdx}`} style={{
              width: '11vw', height: '11vw', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7vw',
              backgroundColor: (rIdx + cIdx) % 2 === 0 ? '#cbd5e1' : '#475569', color: 'black'
            }}>
              {cell ? pieceUnicode[cell.color === 'w' ? cell.type.toUpperCase() : cell.type] : ''}
            </div>
          )))}
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '360px', marginTop: '15px' }}>
        {analysis && (
          <div style={{ padding: '12px', backgroundColor: '#242f3d', borderRadius: '10px', borderLeft: '4px solid #6ab2f2', marginBottom: '10px' }}>
            <p style={{ fontSize: '13px', margin: '0 0 10px 0', color: '#f5f5f5' }}>{analysis}</p>
            {!isThinking && pendingMove && (
              <button onClick={confirmMove} style={{ 
                width: '100%', padding: '14px', backgroundColor: '#31b545', 
                color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' 
              }}>
                ПОДТВЕРДИТЬ
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {!isThinking && !pendingMove && currentOptions.map(id => (
            <button key={id} onClick={() => proposeMove(id)}
              style={{ 
                flex: '1 1 40%', padding: '15px 10px', borderRadius: '10px', 
                backgroundColor: '#2b5278', border: 'none', color: 'white', 
                fontWeight: 'bold', fontSize: '14px' 
              }}>
              {id.slice(0,2)} → {id.slice(2,4)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}