import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, RotateCcw, X, FastForward, Clock } from 'lucide-react';
import './BarReplayToolbar.css';

export default function BarReplayToolbar({
  isActive,
  onClose,
  onStepForward,
  onReset
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1x, 3x, 5x
  const [currentBar, setCurrentBar] = useState(42);
  const totalBars = 120;

  useEffect(() => {
    let iv = null;
    if (isPlaying) {
      iv = setInterval(() => {
        setCurrentBar(prev => {
          if (prev >= totalBars) {
            setIsPlaying(false);
            return totalBars;
          }
          if (onStepForward) onStepForward();
          return prev + 1;
        });
      }, 1000 / speed);
    }
    return () => clearInterval(iv);
  }, [isPlaying, speed, onStepForward]);

  if (!isActive) return null;

  return (
    <div className="bar-replay-toolbar">
      <div className="replay-title">
        <Clock size={15} color="var(--brand)" />
        <span>BAR REPLAY SIMULATION</span>
      </div>

      <div className="replay-controls">
        <button
          className="replay-btn"
          onClick={() => {
            setCurrentBar(10);
            if (onReset) onReset();
          }}
          title="Reset to Starting Bar"
        >
          <RotateCcw size={14} />
        </button>

        <button
          className="replay-btn play"
          onClick={() => setIsPlaying(!isPlaying)}
          title={isPlaying ? "Pause Simulation" : "Play Historical Bars"}
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
        </button>

        <button
          className="replay-btn"
          onClick={() => {
            setCurrentBar(b => Math.min(totalBars, b + 1));
            if (onStepForward) onStepForward();
          }}
          title="Step 1 Bar Forward"
        >
          <SkipForward size={14} />
        </button>

        <div className="replay-speed-selector">
          {[1, 3, 5].map(s => (
            <button
              key={s}
              className={`speed-pill ${speed === s ? 'active' : ''}`}
              onClick={() => setSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="replay-progress">
          <span>Bar: <b>{currentBar}</b> / {totalBars}</span>
        </div>
      </div>

      <button className="replay-close-btn" onClick={onClose} title="Exit Bar Replay">
        <X size={15} />
      </button>
    </div>
  );
}
