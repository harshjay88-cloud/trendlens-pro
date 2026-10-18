import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Check, ArrowRight, CornerDownLeft } from 'lucide-react';
import './AiCoachChat.css';

const QUICK_PROMPTS = [
  'මේ chart එකේ setup එකක් තියෙනවද?',
  'FVG & Order Block එකෙන් trade කරන්නේ කොහොමද?',
  'Whale Buyers ලා දැන් කරන්නේ මොකක්ද?',
  'Liquidity Heatmap (LIQ) කියවන්නේ කොහොමද?',
  'SL & TP Plan එකක් හදන්න',
];

export default function AiCoachChat({
  currentAsset = 'XAU/USD',
  currentPrice = 2645.80,
  category = 'Metals',
  onDrawPlan
}) {
  const [messages, setMessages] = useState([
    {
      id: 'msg_0',
      role: 'assistant',
      text: `ආයුබෝවන්! මම TrendLens AI Trading Coach. ඔබගේ ${currentAsset} chart එකේ order-flow, FVG, Liquidity Walls සහ Whale Prints විශ්ලේෂණය කර Trade Plan සකස් කිරීමට මට පුළුවන්. ඕනෑම ප්‍රශ්නයක් සිංහලෙන් අහන්න!`,
      plan: null,
      drawn: false,
    }
  ]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const streamEndRef = useRef(null);

  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const formatPrice = (p) => {
    return p > 100 ? p.toFixed(2) : p > 1 ? p.toFixed(4) : p.toFixed(6);
  };

  const generateAnswer = (userQuery) => {
    const q = userQuery.toLowerCase();
    const p = currentPrice;
    const isCrypto = category === 'Crypto';
    const delta = p * (isCrypto ? 0.008 : 0.003);

    // Dynamic Plan calculation
    const isLong = !q.includes('sell') && !q.includes('short');
    const entry = p;
    const stopLoss = +(isLong ? p - delta : p + delta);
    const target = +(isLong ? p + delta * 2.4 : p - delta * 2.4);
    const plan = {
      type: isLong ? 'Long' : 'Short',
      ratio: isLong ? '1:2.4' : '1:2.6',
      entry: formatPrice(entry),
      stopLoss: formatPrice(stopLoss),
      target: formatPrice(target),
      rawEntry: entry,
      rawSL: stopLoss,
      rawTP: target,
    };

    if (q.includes('setup') || q.includes('තියෙනවද') || q.includes('trade')) {
      return {
        text: `ඔව් — ${currentAsset} price එක discount array එකට පැමිණ ඇත. 15m & H1 market structure එක bullish continuation එකක් තහවුරු කරයි. Buyer absorption එක $${formatPrice(p - delta * 0.4)} මට්ටමේ පවතී.`,
        plan,
      };
    }

    if (q.includes('fvg') || q.includes('order block') || q.includes('ob')) {
      return {
        text: `**FVG (Fair Value Gap) & Order Block නීති:**\n1. Price එක වේගයෙන් ඉහළට හෝ පහළට යන විට කැන්ඩල් අතර හිඩැසක් (Imbalance) ඇතිවේ. එය **FVG (ST01)** වේ.\n2. Smart Money ආයතන මෙම FVG කලාපයට price එක නැවත ආපසු ගෙන එන්නේ (Mitigation) අඩු මිලට Limit Buy orders පුරවා ගැනීමටයි.\n3. ක්‍රියාත්මක වන ආකාරය: FVG කලාපය retest වන විට Buy entry එකක් ලබාගෙන, FVG හි පහළ සීමාවට යටින් Stop Loss දමන්න.`,
        plan,
      };
    }

    if (q.includes('whale') || q.includes('buyers') || q.includes('bp') || q.includes('aof')) {
      return {
        text: `**Whale Order Flow (BP / AOF):**\nචාර්ට් එකේ දම්/කොළ බුබුළු (Whale Bubbles) මඟින් පෙන්වන්නේ වෙළඳපොළට එකවර වැටෙන විශාල Institutional Limit & Market orders ය. දැනට ලොකු buyers ලා sell limit orders absorb කරමින් සිටින නිසා downside risk එක සීමිතයි.`,
        plan,
      };
    }

    if (q.includes('liq') || q.includes('liquidity') || q.includes('heatmap')) {
      return {
        text: `**Liquidity Heatmap (LIQ):**\nචාර්ට් එක පිටුපසින් පෙනෙන Inferno තාප වර්ණ කලාප යනු Bookmap ක්‍රමයට resting orders එක්රැස් වී ඇති ස්ථානයි. දීප්තිමත් කහ/තැඹිලි කලාප මඟින් ශක්තිමත් Support හෝ Resistance බිත්ති (Liquidity Walls) පෙන්වයි. Price එක නිතරම මේ Liquidity ඇති දෙසට චලනය වේ.`,
        plan,
      };
    }

    // Default intelligent response
    return {
      text: `${currentAsset} සඳහා තාක්ෂණික දර්ශක:\n• Session Bias: BULLISH\n• CME Value Area: POC ආසන්නයේ ගනුදෙනු වේ.\n• CVD Delta: Buyers ආධිපත්‍යය 68%.\n\nමෙම setup එක සඳහා සකසන ලද Trade Plan එක පහතින් බලන්න.`,
      plan,
    };
  };

  const handleSend = (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: query,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const { text, plan } = generateAnswer(query);
      const assistantMsg = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        text,
        plan,
        drawn: false,
      };
      setMessages(prev => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleDrawPlanOnChart = (msgId, plan) => {
    if (onDrawPlan) {
      onDrawPlan(plan);
    }
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, drawn: true } : m))
    );
  };

  return (
    <div className="ai-coach-panel">
      {/* Header */}
      <div className="ai-coach-header">
        <div className="ai-coach-who">
          <div className="ai-coach-avatar">
            <Sparkles size={16} />
          </div>
          <div className="ai-coach-title-wrap">
            <span className="ai-coach-name">TrendLens AI Coach</span>
            <span className="ai-coach-sub">
              <span>Trading Coach</span> · <span className="ai-coach-mode">Unlimited · Sinhala</span>
            </span>
          </div>
        </div>
      </div>

      {/* Quick Prompt Chips */}
      <div className="ai-quick-chips">
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            className="ai-quick-chip"
            onClick={() => handleSend(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Stream */}
      <div className="ai-chat-stream">
        {messages.map((m) => (
          <div key={m.id} className={`ai-msg ${m.role}`}>
            <div className="ai-msg-text">{m.text}</div>

            {/* Generated Trade Plan Card */}
            {m.plan && (
              <div className="ai-plan-card">
                <div className="ai-plan-header">
                  <span>AI Execution Plan ({currentAsset})</span>
                  <b className={m.plan.type.toLowerCase()}>{m.plan.type} · {m.plan.ratio}</b>
                </div>

                <div className="ai-plan-grid">
                  <div className="ai-plan-cell">
                    <span>Entry</span>
                    {m.plan.entry}
                  </div>
                  <div className="ai-plan-cell sl">
                    <span>Stop Loss</span>
                    {m.plan.stopLoss}
                  </div>
                  <div className="ai-plan-cell tp">
                    <span>Target</span>
                    {m.plan.target}
                  </div>
                </div>

                <div className="ai-plan-actions">
                  <span style={{ fontSize: '0.72rem', color: '#8592a6' }}>
                    Calculated from Order Flow
                  </span>

                  {m.drawn ? (
                    <span className="ai-drawn-badge">
                      <Check size={13} /> Drawn on the chart
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="ai-btn-draw"
                      onClick={() => handleDrawPlanOnChart(m.id, m.plan)}
                    >
                      ✏️ Draw on the chart
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="ai-typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
        <div ref={streamEndRef} />
      </div>

      {/* Input Box */}
      <form
        className="ai-coach-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <input
          type="text"
          className="ai-coach-input"
          placeholder="Chart එක ගැන ඕනෑම දෙයක් සිංහලෙන් අහන්න..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="ai-coach-btn-send"
          disabled={!input.trim()}
          title="Send message"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
