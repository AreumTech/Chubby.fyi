/**
 * LandingPage - ChatGPT/Claude Connector Focus
 *
 * Goals:
 * 1. Primary CTA: Connect to ChatGPT/Claude
 * 2. Quick prompts for testing
 * 3. Links to chubby.fyi for full documentation
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { Heading, Text, BodyBase, Label, Caption, Mono } from '@/components/ui/Typography';
import { AppHeader } from '@/components/layout/AppHeader';

/**
 * BrandName - Consistent brand styling throughout the landing page
 */
const BrandName: React.FC = () => (
  <span className="font-semibold">Chubby</span>
);

/**
 * CopyButton - Copy to clipboard with feedback
 */
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
        copied
          ? 'bg-areum-success-bg border-areum-success text-areum-success'
          : 'bg-areum-canvas border-areum-border text-areum-text-secondary hover:border-areum-accent hover:text-areum-accent'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
};

/**
 * PromptCard - Displays a copy-paste prompt with expected output
 */
const PromptCard: React.FC<{
  icon: string;
  title: string;
  prompt: string;
  expected: string;
}> = ({ icon, title, prompt, expected }) => (
  <div className="bg-areum-surface border border-areum-border rounded-lg overflow-hidden">
    <div className="flex items-center justify-between px-4 py-3 bg-areum-canvas border-b border-areum-border">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <Label>{title}</Label>
      </div>
      <CopyButton text={prompt} />
    </div>
    <div className="p-4">
      <p className="text-sm-areum text-areum-text-primary mb-3">{prompt}</p>
      <div className="bg-areum-canvas rounded-md-areum p-3">
        <Caption color="secondary">
          <span className="text-areum-success font-semibold">Expected:</span> {expected}
        </Caption>
      </div>
    </div>
  </div>
);

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-areum-canvas to-white">
      {/* Header */}
      <AppHeader variant="landing" />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-areum-text-primary mb-6 tracking-tight">
            Monte Carlo Financial Planning
            <br />
            <span className="text-areum-accent">in ChatGPT & Claude</span>
          </h1>
          <Text size="md" color="secondary" className="block mb-8 leading-relaxed">
            Run professional-grade retirement simulations through natural conversation.
            Same seed + same inputs = identical output. Always.
          </Text>

          <div className="flex gap-4 justify-center flex-wrap mb-12">
            <a
              href="https://chatgpt.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-areum-accent text-white rounded-md-areum font-medium hover:bg-areum-accent-hover transition-colors"
            >
              Open in ChatGPT
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17L17 7M17 7H7M17 7V17"/>
              </svg>
            </a>
            <a
              href="https://chubby.fyi/setup/claude.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-areum-surface border border-areum-border text-areum-text-primary rounded-md-areum font-medium hover:border-areum-accent transition-colors"
            >
              Claude Setup Guide
            </a>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-areum-surface border border-areum-border rounded-md-areum p-4">
              <div className="text-2xl mb-2">🎲</div>
              <Label className="block mb-1">100 MC Paths</Label>
              <Caption color="secondary">Monte Carlo simulation</Caption>
            </div>
            <div className="bg-areum-surface border border-areum-border rounded-md-areum p-4">
              <div className="text-2xl mb-2">📈</div>
              <Label className="block mb-1">GARCH Volatility</Label>
              <Caption color="secondary">Crash clustering</Caption>
            </div>
            <div className="bg-areum-surface border border-areum-border rounded-md-areum p-4">
              <div className="text-2xl mb-2">🔗</div>
              <Label className="block mb-1">8-Asset Corr</Label>
              <Caption color="secondary">Correlation matrix</Caption>
            </div>
            <div className="bg-areum-surface border border-areum-border rounded-md-areum p-4">
              <div className="text-2xl mb-2">🔒</div>
              <Label className="block mb-1">Deterministic</Label>
              <Caption color="secondary">Seeded, reproducible</Caption>
            </div>
          </div>
        </div>
      </section>

      {/* Try These Prompts */}
      <section className="bg-areum-surface py-16 border-y border-areum-border">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <Heading size="lg" className="mb-3">Try These Prompts</Heading>
            <Text size="md" color="secondary" className="block">
              Copy and paste into ChatGPT or Claude with the <BrandName /> connector.
            </Text>
          </div>

          <div className="space-y-4">
            <PromptCard
              icon="🎯"
              title="Basic Retirement"
              prompt="I'm 35, make $150k/year, spend $50k, and have $800k saved. Run a 30-year simulation with seed 12345."
              expected='"This plan covers baseline spending through Age 65" with healthy trajectory.'
            />

            <PromptCard
              icon="⚠️"
              title="Constrained Plan"
              prompt="Run a simulation: age 55, $400k saved, no income (retired), spending $80k/year. Use seed 22222."
              expected='"Around Age 63 in typical outcome" with stress ages and constraint probability.'
            />

            <PromptCard
              icon="📉"
              title="Concentration Risk"
              prompt="I'm 40 with $2M saved. 40% is in company stock. What if the stock drops 50%? Income $200k, spending $80k. Seed 55555."
              expected="Side-by-side comparison showing baseline vs after-loss trajectories."
            />

            <PromptCard
              icon="🏖️"
              title="Sabbatical Planning"
              prompt="Can I take a 6-month sabbatical in 2 years? I'm 38, have $600k saved, make $140k, spend $55k. Seed 44444."
              expected="Shows income gap modeling with temporary $0 income for 6 months."
            />
          </div>

          <div className="text-center mt-8">
            <a
              href="https://chubby.fyi/try.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-areum-accent hover:underline"
            >
              See all example prompts →
            </a>
          </div>
        </div>
      </section>

      {/* Quick Setup */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <Heading size="lg" className="mb-3">Quick Setup</Heading>
            <Text size="md" color="secondary" className="block">
              Add the MCP connector to ChatGPT or Claude.
            </Text>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* ChatGPT Setup */}
            <div className="bg-areum-surface border border-areum-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-2xl">💬</div>
                <Heading size="md">ChatGPT</Heading>
              </div>
              <ol className="space-y-3 text-sm-areum text-areum-text-secondary">
                <li>1. Go to ChatGPT Apps → Create/Edit GPT</li>
                <li>2. Add Connector (MCP Server)</li>
                <li>3. URL: <Mono className="text-areum-accent">https://api.chubby.fyi/mcp</Mono></li>
                <li>4. Auth: None</li>
              </ol>
              <a
                href="https://chubby.fyi/setup/chatgpt.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-areum-accent hover:underline text-sm"
              >
                Full setup guide →
              </a>
            </div>

            {/* Claude Setup */}
            <div className="bg-areum-surface border border-areum-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-2xl">🤖</div>
                <Heading size="md">Claude</Heading>
              </div>
              <ol className="space-y-3 text-sm-areum text-areum-text-secondary">
                <li>1. Open Claude Desktop or claude.ai</li>
                <li>2. Settings → Connectors → Add custom</li>
                <li>3. URL: <Mono className="text-areum-accent">https://api.chubby.fyi/mcp</Mono></li>
                <li>4. Enable and start chatting</li>
              </ol>
              <a
                href="https://chubby.fyi/setup/claude.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-areum-accent hover:underline text-sm"
              >
                Full setup guide →
              </a>
            </div>
          </div>

          <div className="mt-8 p-4 bg-areum-success-bg border border-areum-success-border rounded-md-areum">
            <div className="flex items-start gap-3">
              <span className="text-xl">🔒</span>
              <div>
                <Label className="block mb-1 text-areum-success-text">Privacy by Architecture</Label>
                <Caption color="secondary">
                  With Claude, your simulation results are transmitted via fragment URLs — never sent to any server.
                  <a
                    href="https://chubby.fyi/privacy.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-areum-accent hover:underline ml-1"
                  >
                    Learn more →
                  </a>
                </Caption>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learn More */}
      <section className="bg-areum-surface py-16 border-y border-areum-border">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <Heading size="lg" className="mb-3">Learn More</Heading>
            <Text size="md" color="secondary" className="block">
              Deep dives into methodology, examples, and supported features.
            </Text>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <a
              href="https://chubby.fyi/learn/stochastic-vs-deterministic.html"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white border border-areum-border rounded-lg p-5 hover:border-areum-accent transition-colors"
            >
              <div className="text-2xl mb-3">🎲</div>
              <Label className="block mb-2">Stochastic vs Deterministic</Label>
              <Caption color="secondary">Why Monte Carlo beats "assume 7%"</Caption>
            </a>

            <a
              href="https://chubby.fyi/learn/simulation-methodology.html"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white border border-areum-border rounded-lg p-5 hover:border-areum-accent transition-colors"
            >
              <div className="text-2xl mb-3">📊</div>
              <Label className="block mb-2">Methodology</Label>
              <Caption color="secondary">GARCH, fat tails, correlation matrix</Caption>
            </a>

            <a
              href="https://chubby.fyi/examples/"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white border border-areum-border rounded-lg p-5 hover:border-areum-accent transition-colors"
            >
              <div className="text-2xl mb-3">📋</div>
              <Label className="block mb-2">Example Scenarios</Label>
              <Caption color="secondary">FIRE, sabbatical, concentration risk</Caption>
            </a>
          </div>
        </div>
      </section>

      {/* Dev Tools */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Caption color="tertiary" className="block mb-4">Development Tools</Caption>
          <div className="flex gap-4 justify-center">
            <Button variant="secondary" onClick={() => navigate('/test-harness')} className="text-sm">
              Test Harness
            </Button>
            <Button variant="secondary" onClick={() => navigate('/app')} className="text-sm">
              Full App
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-areum-border bg-areum-surface py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <Caption color="tertiary" className="block mb-2">
            <BrandName /> is an educational tool, not financial advice.
          </Caption>
          <Caption color="tertiary">
            This simulation answers: "What tends to happen under these assumptions?"
            <br />
            It never answers: "What should I do?"
          </Caption>
        </div>
      </footer>
    </div>
  );
};
