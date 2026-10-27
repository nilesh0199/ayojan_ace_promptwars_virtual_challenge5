'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePlan } from '../plan-context';
import { ASK_AI_STARTER_QUESTIONS } from '@/lib/constants';
import { AiLoader } from '../ai-loader';
import {
  Send,
  Sparkles,
  Trash2,
  HelpCircle,
  AlertCircle,
  User,
  Bot,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const ASK_AI_LOADING_MESSAGES = [
  'Consulting cultural traditions & ritual etiquette...',
  'Reviewing your celebration budget & timeline...',
  'Synthesizing practical host advice...',
];

export function TabAskAi() {
  const { activePlan } = usePlan();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  if (!activePlan) return null;

  const starterQuestions =
    ASK_AI_STARTER_QUESTIONS[activePlan.eventType] || ASK_AI_STARTER_QUESTIONS.Wedding;

  const handleSendMessage = async (textToSend?: string) => {
    const question = (textToSend || input).trim();
    if (!question || isLoading) return;

    setError(null);
    setErrorCode(null);
    setInput('');
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const planSummary = {
        title: activePlan.title,
        eventType: activePlan.eventType,
        city: activePlan.city,
        date: activePlan.date,
        guestCount: activePlan.guestCount,
        totalBudget: activePlan.totalBudget,
        currency: activePlan.currency,
        styleCulture: activePlan.styleCulture,
        muhuratTime: activePlan.muhuratTime,
        muhuratLabel: activePlan.muhuratLabel,
      };

      const historyPayload = newMessages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/plan/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          planSummary,
          messages: historyPayload.slice(0, -1), // prior history
          message: question,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setErrorCode(errJson.code || 'AI_BUSY');
        throw new Error(errJson.message || 'Our AI assistant is momentarily busy. Please try again.');
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled cleanly
        return;
      }
      setError(
        err instanceof Error ? err.message : 'Unable to receive guidance at this moment. Please try again.'
      );
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleClear = () => {
    setMessages([]);
    setError(null);
    setErrorCode(null);
  };

  // Safe markdown-like bold and bullet point renderer
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed text-sm">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-2" />;

          // Process bold tokens (**bold**)
          const parts = line.split(/(\*\*.*?\*\*)/g);
          const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');

          return (
            <p
              key={idx}
              className={isBullet ? 'pl-4 relative before:content-["•"] before:absolute before:left-1 before:text-accent font-normal' : ''}
            >
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <strong key={pIdx} className="font-semibold text-ink">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return isBullet && pIdx === 0 ? part.replace(/^[-•]\s*/, '') : part;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="rounded-2xl border border-rule bg-paper-card p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-accent font-medium text-xs font-mono uppercase">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Celebration Doubt Assistant</span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-ink">
            Ask AI About Your Celebration
          </h2>
          <p className="text-sm text-ink-muted leading-relaxed max-w-2xl">
            Ask anything about timing, rituals, budgeting adjustments, rain contingencies, or guest
            etiquette for {activePlan.title}. Answers are tailored to your {activePlan.city} celebration.
          </p>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rule text-xs font-medium text-ink-muted hover:text-state-error hover:bg-paper-subtle transition-colors shrink-0 min-h-[38px]"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Clear conversation</span>
          </button>
        )}
      </div>

      {/* Starter Question Chips */}
      {messages.length === 0 && (
        <div className="rounded-2xl border border-dashed border-rule bg-paper p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-ink-muted uppercase">
            <HelpCircle className="h-4 w-4 text-accent" aria-hidden="true" />
            <span>Suggested Questions for {activePlan.eventType}</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {starterQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(q)}
                disabled={isLoading}
                className="text-left text-xs font-medium p-3 rounded-xl border border-rule bg-paper-card hover:bg-paper-subtle hover:border-accent text-ink transition-colors max-w-md shadow-2xs group min-h-[44px]"
              >
                <span className="group-hover:text-accent transition-colors">&ldquo;{q}&rdquo;</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages Log Area */}
      <div
        role="log"
        aria-live="polite"
        data-lenis-prevent
        aria-label="Celebration doubt discussion log"
        className="rounded-2xl border border-rule bg-paper-card p-4 sm:p-6 min-h-[320px] max-h-[560px] overflow-y-auto space-y-4 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="text-center py-12 text-ink-muted space-y-2">
            <Bot className="h-10 w-10 text-accent/50 mx-auto" aria-hidden="true" />
            <p className="text-sm font-medium text-ink">Have a question or hesitation?</p>
            <p className="text-xs text-ink-muted max-w-sm mx-auto">
              Click a suggested question above or type your doubt below to receive personalized guidance.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div
                className="h-8 w-8 rounded-full bg-accent-subtle text-accent flex items-center justify-center shrink-0 mt-1 shadow-2xs"
                aria-hidden="true"
              >
                <Bot className="h-4 w-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-2xs space-y-1 ${
                msg.role === 'user'
                  ? 'bg-accent text-accent-text rounded-tr-xs'
                  : 'bg-paper border border-rule text-ink rounded-tl-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-4 text-[10px] opacity-75 font-mono">
                <span>{msg.role === 'user' ? 'You' : 'Aayojan Ace AI'}</span>
                <span>{msg.timestamp}</span>
              </div>
              <div className="pt-0.5">
                {msg.role === 'assistant' ? (
                  renderFormattedText(msg.content)
                ) : (
                  <p className="text-sm font-medium">{msg.content}</p>
                )}
              </div>
            </div>

            {msg.role === 'user' && (
              <div
                className="h-8 w-8 rounded-full bg-paper-subtle border border-rule text-ink flex items-center justify-center shrink-0 mt-1"
                aria-hidden="true"
              >
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {/* Loading Ring with Cancel */}
        {isLoading && (
          <div className="py-2">
            <AiLoader
              title="Formulating Guidance"
              messages={ASK_AI_LOADING_MESSAGES}
              onCancel={handleCancel}
              cancelLabel="Cancel response"
            />
          </div>
        )}

        {/* Error Notice in Log */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-xl bg-state-error-subtle border border-state-error text-state-error text-xs"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold">{error}</p>
              <p className="text-[10px] font-mono opacity-80" data-testid="error-reference">
                Reference: {errorCode || 'AI_ERROR'}
              </p>
              <p className="text-[11px] opacity-90">
                You can try asking again or check saved celebration recommendations.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <label htmlFor="ask-ai-input" className="sr-only">
            Ask a celebration doubt or question
          </label>
          <input
            id="ask-ai-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            maxLength={500}
            placeholder={`Ask about timing, catering, decor, or rituals for ${activePlan.city}...`}
            className="w-full min-h-[48px] rounded-xl border border-rule bg-paper px-4 pr-16 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-hidden disabled:opacity-50"
          />
          <span className="absolute right-3 top-3.5 text-[10px] text-ink-faint font-mono pointer-events-none">
            {input.length}/500
          </span>
        </div>

        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          aria-label="Send celebration inquiry"
          className="min-h-[48px] px-5 rounded-xl bg-accent text-accent-text font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shadow-xs"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
      </form>
    </div>
  );
}
