import React, { useState } from 'react';
import {
  Crosshair,
  TrendingUp,
  Percent,
  Square,
  Type,
  Activity,
  Maximize2,
  Ruler,
  ZoomIn,
  Magnet,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Sliders,
  ArrowRight,
  Minus
} from 'lucide-react';
import './TradingViewLeftToolbar.css';

export default function TradingViewLeftToolbar({ onSelectTool, onClearDrawings, activeTool = 'crosshair' }) {
  const [currentTool, setCurrentTool] = useState(activeTool);
  const [magnetActive, setMagnetActive] = useState(false);
  const [lockedActive, setLockedActive] = useState(false);
  const [hiddenActive, setHiddenActive] = useState(false);
  const [openFlyout, setOpenFlyout] = useState(null);

  const handleToolClick = (toolId, toolName) => {
    setCurrentTool(toolId);
    if (onSelectTool) onSelectTool(toolId, toolName);
    setOpenFlyout(null);
  };

  return (
    <div className="tv-left-toolbar">
      {/* 1. Cursor / Crosshair */}
      <button
        type="button"
        className={`tv-tool-btn ${currentTool === 'crosshair' ? 'active' : ''}`}
        onClick={() => handleToolClick('crosshair', 'Crosshair')}
        title="Crosshair (C)"
      >
        <Crosshair size={16} />
      </button>

      {/* 2. Lines & Rays */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className={`tv-tool-btn ${currentTool.startsWith('line_') ? 'active' : ''}`}
          onClick={() => setOpenFlyout(openFlyout === 'lines' ? null : 'lines')}
          title="Trend Line Tools (Alt+T)"
        >
          <TrendingUp size={16} />
          <span className="tv-tool-arrow">▸</span>
        </button>
        {openFlyout === 'lines' && (
          <div className="tv-flyout-menu">
            <button className="tv-flyout-item" onClick={() => handleToolClick('line_trend', 'Trendline')}>
              <TrendingUp size={14} /> <span>Trend Line</span>
            </button>
            <button className="tv-flyout-item" onClick={() => handleToolClick('line_ray', 'Ray')}>
              <ArrowRight size={14} /> <span>Ray</span>
            </button>
            <button className="tv-flyout-item" onClick={() => handleToolClick('line_horiz', 'Horizontal Line')}>
              <Minus size={14} /> <span>Horizontal Line (Alt+H)</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Fibonacci & Pitchfork */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className={`tv-tool-btn ${currentTool.startsWith('fib_') ? 'active' : ''}`}
          onClick={() => setOpenFlyout(openFlyout === 'fib' ? null : 'fib')}
          title="Fibonacci & Pitchfork Tools (Alt+F)"
        >
          <Percent size={15} />
          <span className="tv-tool-arrow">▸</span>
        </button>
        {openFlyout === 'fib' && (
          <div className="tv-flyout-menu">
            <button className="tv-flyout-item" onClick={() => handleToolClick('fib_retracement', 'Fib Retracement')}>
              <Percent size={14} /> <span>Fib Retracement (0.618 Golden Pocket)</span>
            </button>
            <button className="tv-flyout-item" onClick={() => handleToolClick('fib_extension', 'Fib Extension')}>
              <TrendingUp size={14} /> <span>Trend-Based Fib Extension</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Geometric Shapes / Rectangle */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className={`tv-tool-btn ${currentTool.startsWith('shape_') ? 'active' : ''}`}
          onClick={() => setOpenFlyout(openFlyout === 'shapes' ? null : 'shapes')}
          title="Geometric Shapes (Brush / Rectangle)"
        >
          <Square size={15} />
          <span className="tv-tool-arrow">▸</span>
        </button>
        {openFlyout === 'shapes' && (
          <div className="tv-flyout-menu">
            <button className="tv-flyout-item" onClick={() => handleToolClick('shape_box', 'Rectangle')}>
              <Square size={14} /> <span>Rectangle (Order Block / Zone)</span>
            </button>
            <button className="tv-flyout-item" onClick={() => handleToolClick('shape_brush', 'Brush')}>
              <Sliders size={14} /> <span>Brush</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Annotation / Text */}
      <button
        type="button"
        className={`tv-tool-btn ${currentTool === 'text' ? 'active' : ''}`}
        onClick={() => handleToolClick('text', 'Text Note')}
        title="Text & Annotation (T)"
      >
        <Type size={16} />
      </button>

      {/* 6. Patterns & Waves */}
      <button
        type="button"
        className={`tv-tool-btn ${currentTool === 'patterns' ? 'active' : ''}`}
        onClick={() => handleToolClick('patterns', 'Elliott Waves & Patterns')}
        title="Patterns (Head & Shoulders, Elliott Wave)"
      >
        <Activity size={16} />
      </button>

      {/* 7. Long / Short Position Tool */}
      <button
        type="button"
        className={`tv-tool-btn ${currentTool === 'position' ? 'active' : ''}`}
        onClick={() => handleToolClick('position', 'Long/Short Position Bracket')}
        title="Prediction and Measurement (Long/Short R:R Tool)"
      >
        <Maximize2 size={15} />
      </button>

      {/* 8. Measure Ruler */}
      <button
        type="button"
        className={`tv-tool-btn ${currentTool === 'ruler' ? 'active' : ''}`}
        onClick={() => handleToolClick('ruler', 'Ruler Measure')}
        title="Measure (Shift + Click)"
      >
        <Ruler size={16} />
      </button>

      {/* 9. Zoom */}
      <button
        type="button"
        className={`tv-tool-btn ${currentTool === 'zoom' ? 'active' : ''}`}
        onClick={() => handleToolClick('zoom', 'Zoom')}
        title="Zoom In"
      >
        <ZoomIn size={16} />
      </button>

      <div className="tv-tool-divider" />

      {/* Bottom utility controls */}
      <div className="tv-tool-bottom">
        {/* Magnet Mode */}
        <button
          type="button"
          className={`tv-tool-btn ${magnetActive ? 'active' : ''}`}
          onClick={() => setMagnetActive(!magnetActive)}
          title={`Magnet Mode: ${magnetActive ? 'ON (Snaps to OHLC)' : 'OFF'}`}
        >
          <Magnet size={15} />
        </button>

        {/* Lock All Drawings */}
        <button
          type="button"
          className={`tv-tool-btn ${lockedActive ? 'active' : ''}`}
          onClick={() => setLockedActive(!lockedActive)}
          title={`Lock All Drawing Tools: ${lockedActive ? 'LOCKED' : 'UNLOCKED'}`}
        >
          <Lock size={14} />
        </button>

        {/* Hide All Drawings */}
        <button
          type="button"
          className={`tv-tool-btn ${hiddenActive ? 'active' : ''}`}
          onClick={() => setHiddenActive(!hiddenActive)}
          title={hiddenActive ? 'Show All Drawings' : 'Hide All Drawings'}
        >
          {hiddenActive ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>

        {/* Clear Drawings Trash */}
        <button
          type="button"
          className="tv-tool-btn"
          onClick={() => {
            if (onClearDrawings) onClearDrawings();
          }}
          title="Remove All Drawings (Delete / Trash)"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
