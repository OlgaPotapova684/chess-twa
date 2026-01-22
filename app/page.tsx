'use client';
import { useState, useEffect } from "react";
import { Chess, Square } from "chess.js";

declare global {
  interface Window {
    Telegram?: any;
  }
}

export default function TelegramChess() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<'quiz' | 'game'>('quiz');
  
  // Состояния квиза
  const [userSettings, setUserSettings] = useState({
    side: 'w',
    timeMode: 'none',
    level: 'beginner'
  });

  const [game, setGame] = useState(new Chess());
  const [analysis, setAnalysis] = useState("");
  const [statusMessage, setStatusMessage] = useState("Партия началась 🏆");
  const [isThinking, setIsThinking] = useState(false);
  const [pendingMove, setPendingMove] = useState<string | null>(null);
  const [currentOptions, setCurrentOptions] = useState(["e2e4", "d2d4", "g1f3"]);

  useEffect(() => {
    setMounted(true);
    // @ts-ignore
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      // @ts-ignore
      window.Telegram.WebApp.ready();
      // @ts-ignore
      window.Telegram.WebApp.expand();
    }
  }, []);

  // ВАЖНО: Весь рендеринг происходит ТОЛЬКО после mounted
  if (!mounted) {
    return <div style={{ backgroundColor: '#17212b', minHeight: '100vh' }} />;
  }

  const startTournament = () => {
    if (userSettings.side === 'b') {
      const g = new Chess();
      g.move("e4");
      setGame(g);
      setStatusMessage("Белые пошли e4. Ваш ответ?");
      const replies = g.moves({verbose: true}).slice(0,4).map(m => m.from + m.to);
      setCurrentOptions(replies);
    }
    setStep('game');
    // @ts-ignore
    if (window.Telegram?.WebApp) window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
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
        // @ts-ignore
        if (window.Telegram?.WebApp) window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        setTimeout(() => {
          const computerGame = new Chess(gameCopy.fen());
          const moves = computerGame.moves({ verbose: true });
          if (moves.length === 0) { setStatusMessage("Игра окончена!"); setIsThinking(false); return; }
          const bestReply = moves[Math.floor(Math.random() * moves.length)];
          computerGame.move(bestReply);
          setGame(new Chess(computerGame.fen()));
          setIsThinking(false);
          setStatusMessage("Ваш следующий шаг?");
          const nextMoves = computerGame.moves({ verbose: true }).sort(() => 0.5 - Math.random()).slice(0, 4).map(m => m.from + m.to);
          setCurrentOptions(nextMoves);
        }, 1500);
      }
    } catch (e) { console.error(e); }
  };

  const proposeMove = (moveId: string) => {
    setPendingMove(moveId);
    const gameCopy = new Chess(game.fen());
    try {
      // @ts-ignore
      const move = gameCopy.move({ from: moveId.slice(0,2), to: moveId.slice(2,4), promotion: 'q' });
      const piece = game.get(move.from as Square);
      let text = `✅ План: Ход ${piece.type.toUpperCase()} на ${move.to}. `;
      if (['e4', 'd4', 'e5', 'd5'].includes(move.to)) text += "Контроль центра. ";
      if (move.captured) text += `Взятие ${move.captured.toUpperCase()}! `;
      setAnalysis(text);
      // @ts-ignore
      if (window.Telegram?.WebApp) window.Telegram.WebApp.HapticFeedback.selectionChanged();
    } catch { setAnalysis("Ход возможен."); }
  };

  const board = game.board();
  const pieceUnicode: any = {
    'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',
    'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔',
  };

  if (step === 'quiz') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 20px', backgroundColor: '#17212b', minHeight: '100vh', color: '#f5f5f5', fontFamily: 'sans-serif' }}>
        <h2 style={{ color: '#6ab2f2', textAlign: 'center' }}>Настройка тренировки</h2>
        <div style={{ width: '100%', maxWidth: '300px', marginTop: '20px' }}>
          <p style={{ color: '#808d99', marginBottom: '10px' }}>Выберите сторону:</p>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button onClick={() => setUserSettings({...userSettings, side: 'w'})} style={{ flex: 1, padding: '15px', borderRadius: '10px', border: userSettings.side === 'w' ? '2px solid #6ab2f2' : 'none', backgroundColor: '#242f3d', color: 'white' }}>⚪️ Белые</button>
            <button onClick={() => setUserSettings({...userSettings, side: 'b'})} style={{ flex: 1, padding: '15px', borderRadius: '10px', border: userSettings.side === 'b' ? '2px solid #6ab2f2' : 'none', backgroundColor: '#242f3d', color: 'white' }}>⚫️ Черные</button>
          </div>
          <p style={{ color: '#808d99', marginBottom: '10px' }}>Режим времени:</p>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button onClick={() => setUserSettings({...userSettings, timeMode: 'blitz'})} style={{ flex: 1, padding: '15px', borderRadius: '10px', border: userSettings.timeMode === 'blitz' ? '2px solid #6ab2f2' : 'none', backgroundColor: '#242f3d', color: 'white' }}>⚡️ Блиц</button>
            <button onClick={() => setUserSettings({...userSettings, timeMode: 'none'})} style={{ flex: 1, padding: '15px', borderRadius: '10px', border: userSettings.timeMode === 'none' ? '2px solid #6ab2f2' : 'none', backgroundColor: '#242f3d', color: 'white' }}>♾ Безлимит</button>
          </div>
          <p style={{ color: '#808d99', marginBottom: '10px' }}>Ваш уровень:</p>
          <select value={userSettings.level} onChange={(e) => setUserSettings({...userSettings, level: e.target.value})} style={{ width: '100%', padding: '15px', borderRadius: '10px', backgroundColor: '#242f3d', color: 'white', border: 'none', marginBottom: '30px' }}>
            <option value="beginner">Новичок</option>
            <option value="club">Клубный игрок</option>
            <option value="pro">Профи</option>
          </select>
          <button onClick={startTournament} style={{ width: '100%', padding: '20px', borderRadius: '12px', backgroundColor: '#31b545', color: 'white', fontWeight: 'bold', fontSize: '16px', border: 'none' }}>НАЧАТЬ</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px', backgroundColor: '#17212b', minHeight: '100vh', color: '#f5f5f5', fontFamily: 'sans-serif' }}>
      <h3 style={{ color: '#6ab2f2', margin: '10px 0' }}>Шахматный Тренер</h3>
      <div style={{ height: '30px', fontSize: '14px', color: '#808d99' }}>{statusMessage}</div>
      <div style={{ padding: '10px', backgroundColor: '#242f3d', borderRadius: '8px', marginTop: '5px' }}>
        <div style={{ display: 'flex', marginLeft: '20px' }}>
          {['a','b','c','d','e','f','g','h'].map(l => (
            <div key={l} style={{ width: '10.5vw', textAlign: 'center', fontSize: '10px', color: '#64748b' }}>{l}</div>
          ))}
        </div>
        <div style={{ display: 'flex' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {['8','7','6','5','4','3','2','1'].map(n => (
              <div key={n} style={{ height: '10.5vw', width: '20px', display: 'flex', alignItems: 'center', fontSize: '10px', color: '#64748b' }}>{n}</div>
            ))}
          </div>
          <div style={{ border: '1px solid #334155', display: 'grid', gridTemplateColumns: 'repeat(8, 10.5vw)' }}>
            {board.map((row, rIdx) => row.map((cell, cIdx) => (
              <div key={`${rIdx}-${cIdx}`} style={{ width: '10.5vw', height: '10.5vw', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7vw', backgroundColor: (rIdx + cIdx) % 2 === 0 ? '#cbd5e1' : '#475569', color: 'black' }}>
                {cell ? pieceUnicode[cell.color === 'w' ? cell.type.toUpperCase() : cell.type] : ''}
              </div>
            )))}
          </div>
        </div>
      </div>
      <div style={{ width: '100%', maxWidth: '360px', marginTop: '15px' }}>
        {analysis && (
          <div style={{ padding: '12px', backgroundColor: '#242f3d', borderRadius: '10px', borderLeft: '4px solid #6ab2f2', marginBottom: '10px' }}>
            <p style={{ fontSize: '13px', margin: '0 0 10px 0', color: '#f5f5f5' }}>{analysis}</p>
            {!isThinking && pendingMove && (
              <button onClick={confirmMove} style={{ width: '100%', padding: '14px', backgroundColor: '#31b545', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>ПОДТВЕРДИТЬ</button>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {!isThinking && !pendingMove && currentOptions.map(id => (
            <button key={id} onClick={() => proposeMove(id)} style={{ flex: '1 1 40%', padding: '15px 10px', borderRadius: '10px', backgroundColor: '#2b5278', border: 'none', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
              {id.slice(0,2)} → {id.slice(2,4)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}