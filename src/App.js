import { useState, useEffect } from 'react';

const NAVY = '#0a0f2c';
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
const TICKER_SYMBOLS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN'];

const CHART_RANGES = ['1D', '5D', '1M', '6M', 'YTD', '1Y', 'All'];
const NEWS_FILTERS = ['All', 'Company', 'Sector', 'Macro'];

function formatVolume(volume) {
  if (volume == null) return '—';
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume.toLocaleString();
}

async function fetchJson(url) {
  const response = await fetch(url);
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    throw new Error(
      'Unable to reach the stock API. Run npm start from the clarifi folder to start the server on port 5000.'
    );
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Request failed.');
  }
  return data;
}

async function fetchStockQuote(symbol) {
  return fetchJson(`${API_BASE}/api/stock/${encodeURIComponent(symbol)}`);
}

async function fetchNavTickers() {
  const results = await Promise.all(
    TICKER_SYMBOLS.map(async (symbol) => {
      try {
        const data = await fetchJson(`${API_BASE}/api/stock/${symbol}`);
        return { symbol: data.symbol, changePercent: data.changePercent };
      } catch {
        return { symbol, changePercent: 0 };
      }
    })
  );
  return results;
}

const NEWS_ITEMS = [
  {
    headline: 'Apple unveils new AI features across iPhone and Mac lineup',
    source: 'Reuters',
    timestamp: '2 hours ago',
    summary: 'Expanded on-device AI could strengthen ecosystem lock-in and services revenue over the next 12–18 months.',
    category: 'Company',
  },
  {
    headline: 'Semiconductor sector rallies on strong datacenter demand outlook',
    source: 'Bloomberg',
    timestamp: '5 hours ago',
    summary: 'Broader chip strength supports Apple supply chain efficiency and margin stability heading into holiday quarter.',
    category: 'Sector',
  },
  {
    headline: 'Fed signals patience on rate cuts amid sticky inflation data',
    source: 'CNBC',
    timestamp: '8 hours ago',
    summary: 'Higher-for-longer rates may compress growth stock multiples, though Apple\'s cash flow profile remains resilient.',
    category: 'Macro',
  },
];

const AI_BULLETS = [
  'Strong brand loyalty and recurring services revenue continue to support long-term earnings stability.',
  'Recent product cycle momentum suggests upside to near-term iPhone revenue, particularly in premium tiers.',
  'Valuation remains above sector median — monitor margin trends and China exposure as key swing factors.',
];

const quadrantStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  backgroundColor: '#ffffff',
  overflow: 'hidden',
};

function TickerItem({ symbol, changePercent }) {
  const positive = changePercent >= 0;
  const formatted = `${positive ? '+' : ''}${changePercent.toFixed(2)}%`;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginRight: '32px' }}>
      <span style={{ fontWeight: 600, color: NAVY, letterSpacing: '0.02em' }}>{symbol}</span>
      <span style={{ color: positive ? '#16a34a' : '#dc2626', fontWeight: 500, fontSize: '13px' }}>
        {formatted}
      </span>
    </span>
  );
}

function NavBar({ tickers, onLogoClick }) {
  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        height: '56px',
        borderBottom: '1px solid #f1f5f9',
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(8px)',
        zIndex: 10,
      }}
    >
      <span
        onClick={onLogoClick}
        style={{
          fontSize: '18px',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: NAVY,
          cursor: onLogoClick ? 'pointer' : 'default',
        }}
      >
        Clarifi
      </span>

      <div
        style={{
          width: '420px',
          overflow: 'hidden',
          maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        }}
      >
        <div className="ticker-track" style={{ display: 'inline-flex', whiteSpace: 'nowrap', fontSize: '14px' }}>
          {[...tickers, ...tickers].map((t, i) => (
            <TickerItem key={i} symbol={t.symbol} changePercent={t.changePercent} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function LandingPage({ ticker, setTicker, onAnalyze, loading, error }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (ticker.trim() && !loading) {
      onAnalyze(ticker.trim().toUpperCase());
    }
  };

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '100px 24px 80px',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: '#64748b',
          margin: '0 0 10px',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        Welcome
      </p>

      <h1
        style={{
          fontSize: 'clamp(20px, 2.4vw, 28px)',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          lineHeight: 1.2,
          margin: '0 0 16px',
          color: NAVY,
          whiteSpace: 'nowrap',
        }}
      >
        What Stock Would You Like to Analyze?
      </h1>

      <p
        style={{
          fontSize: '17px',
          color: '#64748b',
          margin: '0 0 28px',
          maxWidth: '480px',
          lineHeight: 1.6,
          fontWeight: 400,
        }}
      >
        Instant AI-powered research for long-term investors and swing traders.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          width: '100%',
          maxWidth: '480px',
        }}
      >
        <input
          className="search-input"
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="Enter ticker (e.g. AAPL)"
          style={{
            flex: 1,
            height: '52px',
            padding: '0 20px',
            fontSize: '16px',
            border: '1.5px solid #e2e8f0',
            borderRadius: '12px',
            backgroundColor: '#fafafa',
            color: NAVY,
            letterSpacing: '0.04em',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        />
        <button
          className="analyze-btn"
          type="submit"
          disabled={loading}
          style={{
            height: '52px',
            padding: '0 24px',
            fontSize: '15px',
            fontWeight: 600,
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background-color 0.15s, transform 0.1s',
            letterSpacing: '-0.01em',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Loading…' : 'Analyze →'}
        </button>
      </form>

      {error && (
        <p
          style={{
            margin: '16px 0 0',
            fontSize: '14px',
            color: '#dc2626',
            maxWidth: '480px',
            lineHeight: 1.5,
          }}
        >
          {error}
        </p>
      )}
    </main>
  );
}

function ToggleButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: active ? 600 : 400,
        color: active ? NAVY : '#64748b',
        backgroundColor: active ? '#ffffff' : 'transparent',
        border: active ? '1px solid #e2e8f0' : '1px solid transparent',
        borderRadius: '6px',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function StockDashboard({ stockData }) {
  const { symbol, companyName, price, change, changePercent, previousClose, volume } = stockData;
  const positive = change >= 0;
  const changeColor = positive ? '#16a34a' : '#dc2626';

  const [chartRange, setChartRange] = useState('1M');
  const [chartType, setChartType] = useState('Line');
  const [newsFilter, setNewsFilter] = useState('All');

  const filteredNews =
    newsFilter === 'All'
      ? NEWS_ITEMS
      : NEWS_ITEMS.filter((item) => item.category === newsFilter);

  return (
    <div>
      {/* Stock header */}
      <div
        style={{
          backgroundColor: '#eef2f7',
          padding: '20px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '15px', fontWeight: 500, color: '#64748b' }}>
          {companyName}
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '28px', fontWeight: 700, color: NAVY, letterSpacing: '-0.02em' }}>
            {symbol}
          </span>
          <span style={{ fontSize: '28px', fontWeight: 700, color: NAVY }}>
            ${price.toFixed(2)}
          </span>
          <span style={{ fontSize: '20px', fontWeight: 600, color: changeColor }}>
            {positive ? '+' : ''}{changePercent.toFixed(2)}%
            {' '}
            ({positive ? '+' : ''}${Math.abs(change).toFixed(2)})
          </span>
        </div>
        <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: '#64748b' }}>
          <span>
            <span style={{ fontWeight: 500, color: NAVY }}>Prev Close: </span>
            {previousClose != null ? `$${previousClose.toFixed(2)}` : '—'}
          </span>
          <span>
            <span style={{ fontWeight: 500, color: NAVY }}>Volume: </span>
            {formatVolume(volume)}
          </span>
        </div>
      </div>

      {/* Dashboard grid */}
      <div style={{ padding: '20px 32px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Top row */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {/* Price chart */}
          <div style={{ ...quadrantStyle, width: '60%', display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 16px 0',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 600, color: NAVY }}>Price Chart</span>
              <div
                style={{
                  display: 'flex',
                  gap: '2px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '8px',
                  padding: '2px',
                }}
              >
                {['Line', 'Candle'].map((type) => (
                  <ToggleButton
                    key={type}
                    label={type}
                    active={chartType === type}
                    onClick={() => setChartType(type)}
                  />
                ))}
              </div>
            </div>
            <div
              style={{
                margin: '12px 16px',
                flex: 1,
                minHeight: '280px',
                backgroundColor: '#374151',
                borderRadius: '8px',
              }}
            />
            <div
              style={{
                display: 'flex',
                gap: '4px',
                padding: '12px 16px 16px',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              {CHART_RANGES.map((range) => (
                <ToggleButton
                  key={range}
                  label={range}
                  active={chartRange === range}
                  onClick={() => setChartRange(range)}
                />
              ))}
            </div>
          </div>

          {/* Heatmap */}
          <div style={{ ...quadrantStyle, width: '40%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 16px 0' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: NAVY }}>Market Heatmap</span>
            </div>
            <div
              style={{
                margin: '12px 16px 16px',
                flex: 1,
                minHeight: '280px',
                backgroundColor: '#d1d5db',
                borderRadius: '8px',
              }}
            />
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {/* News feed */}
          <div style={{ ...quadrantStyle, width: '50%' }}>
            <div style={{ padding: '16px 16px 0' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: NAVY, display: 'block', marginBottom: '12px' }}>
                News Feed
              </span>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                {NEWS_FILTERS.map((filter) => (
                  <ToggleButton
                    key={filter}
                    label={filter}
                    active={newsFilter === filter}
                    onClick={() => setNewsFilter(filter)}
                  />
                ))}
              </div>
            </div>
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredNews.map((item, i) => (
                <div
                  key={i}
                  style={{
                    paddingBottom: i < filteredNews.length - 1 ? '20px' : 0,
                    borderBottom: i < filteredNews.length - 1 ? '1px solid #f1f5f9' : 'none',
                  }}
                >
                  <p style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 600, color: NAVY, lineHeight: 1.4 }}>
                    {item.headline}
                  </p>
                  <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#94a3b8' }}>
                    {item.source} · {item.timestamp}
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 500, color: NAVY }}>Why it matters: </span>
                    {item.summary}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* AI summary */}
          <div style={{ ...quadrantStyle, width: '50%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 16px 0' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: NAVY }}>AI Research Summary</span>
            </div>
            <ul
              style={{
                margin: '16px 16px 0',
                padding: '0 0 0 20px',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {AI_BULLETS.map((bullet, i) => (
                <li key={i} style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
                  {bullet.replace('Apple', companyName.split(' ')[0])}
                </li>
              ))}
            </ul>
            <div style={{ padding: '16px 56px' }}>
              <button
                type="button"
                className="analyze-btn"
                style={{
                  width: '100%',
                  height: '44px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s, transform 0.1s',
                }}
              >
                Generate Full Memo →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState('landing');
  const [ticker, setTicker] = useState('');
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [navTickers, setNavTickers] = useState(
    TICKER_SYMBOLS.map((symbol) => ({ symbol, changePercent: 0 }))
  );

  useEffect(() => {
    fetchNavTickers()
      .then(setNavTickers)
      .catch(() => {});
  }, []);

  const handleAnalyze = async (symbol) => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchStockQuote(symbol);
      setStockData(data);
      setNavTickers((prev) =>
        prev.map((t) =>
          t.symbol === data.symbol ? { ...t, changePercent: data.changePercent } : t
        )
      );
      setView('dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoClick = () => {
    setView('landing');
    setError(null);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', color: NAVY }}>
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: ticker-scroll 25s linear infinite;
        }
        .search-input::placeholder {
          color: #94a3b8;
        }
        .search-input:focus {
          outline: none;
          border-color: ${NAVY};
          box-shadow: 0 0 0 3px rgba(10, 15, 44, 0.08);
        }
        .analyze-btn {
          background-color: ${NAVY};
        }
        .analyze-btn:hover {
          background-color: #1e3a7a;
        }
        .analyze-btn:active {
          transform: scale(0.98);
        }
      `}</style>

      <NavBar
        tickers={navTickers}
        onLogoClick={view === 'dashboard' ? handleLogoClick : undefined}
      />

      {view === 'landing' ? (
        <LandingPage
          ticker={ticker}
          setTicker={setTicker}
          onAnalyze={handleAnalyze}
          loading={loading}
          error={error}
        />
      ) : (
        stockData && <StockDashboard stockData={stockData} />
      )}
    </div>
  );
}

export default App;
