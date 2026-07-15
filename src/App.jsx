import { useState, useRef, useEffect } from 'react';
import CompanyInput from './components/CompanyInput.jsx';
import PipelineStages from './components/PipelineStages.jsx';
import PlanOutput from './components/PlanOutput.jsx';
import Footer from './components/Footer.jsx';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export default function App() {
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState('idle'); // idle | researching | structuring | done | error
  const [plan, setPlan] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const turnstileWidgetId = useRef(null);
  const turnstileToken = useRef(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !window.turnstile) return;
    turnstileWidgetId.current = window.turnstile.render('#turnstile-container', {
      sitekey: TURNSTILE_SITE_KEY,
      size: 'invisible',
      callback: (token) => {
        turnstileToken.current = token;
      },
    });
  }, []);

  const handleGenerate = async () => {
    if (!company.trim() || status === 'researching' || status === 'structuring') return;
    setStatus('researching');
    setErrorMsg('');
    setPlan(null);

    // Refresh the invisible Turnstile token right before the call
    if (window.turnstile && turnstileWidgetId.current !== null) {
      window.turnstile.execute(turnstileWidgetId.current);
      // give the callback a beat to populate turnstileToken.current
      await new Promise((r) => setTimeout(r, 400));
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: company.trim(),
          turnstileToken: turnstileToken.current,
        }),
      });

      if (!res.ok || !res.body) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete last line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);

          if (event.stage === 'research' && event.status === 'start') setStatus('researching');
          if (event.stage === 'structuring' && event.status === 'start') setStatus('structuring');
          if (event.stage === 'complete') {
            setPlan(event.plan);
            setStatus('done');
          }
          if (event.stage === 'error') {
            setErrorMsg(event.message || 'Something went wrong. Try again in a moment.');
            setStatus('error');
          }
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Try again in a moment.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div id="turnstile-container" style={{ display: 'none' }} />

      <header className="border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold">100-Day Plan Generator</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6">
        {status === 'idle' || status === 'error' ? (
          <CompanyInput
            company={company}
            setCompany={setCompany}
            onGenerate={handleGenerate}
            errorMsg={errorMsg}
          />
        ) : null}

        {(status === 'researching' || status === 'structuring') && (
          <PipelineStages status={status} company={company} />
        )}

{status === 'done' && plan && (
          <PlanOutput plan={plan} company={company} onReset={() => { setStatus('idle'); setCompany(''); }} />
        )}
      </main>

      <Footer />
    </div>
  );
}
