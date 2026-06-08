import { useState, useEffect } from 'react';

const NAVY = '#0a0f2c';
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3002';
const TICKER_SYMBOLS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN'];
const NEWS_FILTERS = ['All', 'Company', 'Sector', 'Macro'];
const CHART_HEIGHT = 280;

function getTradingViewSymbol(symbol, exchange) {
  const hint = (exchange || '').toUpperCase();
  if (hint.includes('NYSE') || hint === 'NYQ') return `NYSE:${symbol}`;
  if (hint.includes('AMEX') || hint.includes('ARCA')) return `AMEX:${symbol}`;
  if (hint.includes('NASDAQ') || hint === 'NMS' || hint === 'NGM' || hint === 'NCM') return `NASDAQ:${symbol}`;
  return `NASDAQ:${symbol}`;
}

function TradingViewChart({ symbol, exchange }) {
  const tvSymbol = getTradingViewSymbol(symbol, exchange);
  const chartUrl = `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol)}&interval=D&theme=light&style=2&hidesidetoolbar=0&hidelegend=0&saveimage=0&toolbarbg=f1f3f6&withdateranges=1&showpopupbutton=1&locale=en`;
  return (
    <iframe
      key={tvSymbol}
      title={`${symbol} price chart`}
      src={chartUrl}
      style={{ width: '100%', height: `${CHART_HEIGHT}px`, border: 'none', borderRadius: '8px', display: 'block' }}
      allowFullScreen
    />
  );
}

function formatVolume(v) {
  if (v == null) return '—';
  if (v >= 1e9) return `${(v/1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v/1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v/1e3).toFixed(1)}K`;
  return v.toLocaleString();
}

async function fetchJson(url) {
  const response = await fetch(url);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new Error('Unable to reach the stock API.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}

async function fetchStockQuote(symbol) {
  return fetchJson(`${API_BASE}/api/stock/${encodeURIComponent(symbol)}`);
}

async function fetchNavTickers() {
  return Promise.all(
    TICKER_SYMBOLS.map(async (symbol) => {
      try {
        const data = await fetchJson(`${API_BASE}/api/stock/${symbol}`);
        return { symbol: data.symbol, changePercent: data.changePercent };
      } catch {
        return { symbol, changePercent: 0 };
      }
    })
  );
}

async function fetchNews(ticker) {
  return fetchJson(`${API_BASE}/api/news/${encodeURIComponent(ticker)}`);
}

function generateBullets(stockData) {
  const { symbol, price, changePercent, previousClose,
          fiftyTwoWeekHigh, fiftyTwoWeekLow, marketCap } = stockData;
  const positive = changePercent >= 0;
  const direction = positive ? 'up' : 'down';
  const sentiment = positive ? 'bullish' : 'bearish';

  const formatMarketCap = (mc) => {
    if (!mc) return null;
    if (mc >= 1e12) return `$${(mc / 1e12).toFixed(2)}T`;
    if (mc >= 1e9) return `$${(mc / 1e9).toFixed(2)}B`;
    return `$${(mc / 1e6).toFixed(2)}M`;
  };

  const bullets = [];

  bullets.push(
    `${symbol} is ${direction} ${Math.abs(changePercent).toFixed(2)}% today — momentum is ${sentiment} heading into the next session.`
  );

  if (fiftyTwoWeekHigh && fiftyTwoWeekLow) {
    const range = fiftyTwoWeekHigh - fiftyTwoWeekLow;
    const position = ((price - fiftyTwoWeekLow) / range * 100).toFixed(0);
    bullets.push(
      `Currently at ${position}% of its 52-week range ($${fiftyTwoWeekLow.toFixed(2)} – $${fiftyTwoWeekHigh.toFixed(2)}) — ${
        position > 70 ? 'near highs, watch for resistance' :
        position < 30 ? 'near lows, potential support zone' :
        'mid-range, direction unclear'}.`
    );
  }

  if (marketCap) {
    bullets.push(
      `Market cap of ${formatMarketCap(marketCap)} with prev close at $${previousClose?.toFixed(2)} — use this as your reference point for today's move.`
    );
  }

  return bullets;
}

function HeatmapWidget() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      exchanges: [],
      dataSource: 'SPX500',
      grouping: 'sector',
      blockSize: 'market_cap_basic',
      blockColor: 'change',
      locale: 'en',
      colorTheme: 'light',
      hasTopBar: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      width: '100%',
      height: '400',
    });
    const container = document.getElementById('heatmap-container');
    if (container) container.appendChild(script);
    return () => { if (container) container.innerHTML = ''; };
  }, []);

  return (
    <div
      id="heatmap-container"
      className="tradingview-widget-container"
      style={{ width: '100%', height: '400px', margin: '12px 16px 16px' }}
    >
      <div className="tradingview-widget-container__widget" style={{ height: '100%' }} />
    </div>
  );
}

const quadrantStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  backgroundColor: '#ffffff',
  overflow: 'hidden',
};

function TickerItem({ symbol, changePercent }) {
  const positive = changePercent >= 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginRight: '32px' }}>
      <span style={{ fontWeight: 600, color: NAVY, letterSpacing: '0.02em' }}>{symbol}</span>
      <span style={{ color: positive ? '#16a34a' : '#dc2626', fontWeight: 500, fontSize: '13px' }}>
        {positive ? '+' : ''}{changePercent.toFixed(2)}%
      </span>
    </span>
  );
}

function NavBar({ tickers, onLogoClick }) {
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', height: '56px', borderBottom: '1px solid #f1f5f9',
      position: 'sticky', top: 0, backgroundColor: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(8px)', zIndex: 10,
    }}>
      <span onClick={onLogoClick} style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.03em', color: NAVY, cursor: onLogoClick ? 'pointer' : 'default' }}>
        Clarifi
      </span>
      <div style={{
        width: '420px', overflow: 'hidden',
        maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      }}>
        <div className="ticker-track" style={{ display: 'inline-flex', whiteSpace: 'nowrap', fontSize: '14px' }}>
          {[...tickers, ...tickers].map((t, i) => <TickerItem key={i} symbol={t.symbol} changePercent={t.changePercent} />)}
        </div>
      </div>
    </nav>
  );
}

function LandingPage({ ticker, setTicker, onAnalyze, loading, error }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (ticker.trim() && !loading) onAnalyze(ticker.trim().toUpperCase());
  };
  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 80px', textAlign: 'center' }}>
      <p style={{ fontSize: '14px', fontWeight: 500, color: '#64748b', margin: '0 0 10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Welcome</p>
      <h1 style={{ fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 16px', color: NAVY, whiteSpace: 'nowrap' }}>
        What Stock Would You Like to Analyze?
      </h1>
      <p style={{ fontSize: '17px', color: '#64748b', margin: '0 0 28px', maxWidth: '480px', lineHeight: 1.6, fontWeight: 400 }}>
        Instant AI-powered research for long-term investors and swing traders.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '480px' }}>
        <input
          className="search-input"
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="Enter ticker (e.g. AAPL)"
          style={{ flex: 1, height: '52px', padding: '0 20px', fontSize: '16px', border: '1.5px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#fafafa', color: NAVY, letterSpacing: '0.04em' }}
        />
        <button className="analyze-btn" type="submit" disabled={loading} style={{ height: '52px', padding: '0 24px', fontSize: '15px', fontWeight: 600, color: '#ffffff', border: 'none', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Loading…' : 'Analyze →'}
        </button>
      </form>
      {error && <p style={{ margin: '16px 0 0', fontSize: '14px', color: '#dc2626', maxWidth: '480px' }}>{error}</p>}
    </main>
  );
}

function ToggleButton({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{ padding: '4px 10px', fontSize: '12px', fontWeight: active ? 600 : 400, color: active ? NAVY : '#64748b', backgroundColor: active ? '#ffffff' : 'transparent', border: active ? '1px solid #e2e8f0' : '1px solid transparent', borderRadius: '6px', cursor: 'pointer' }}>
      {label}
    </button>
  );
}

function StockDashboard({ stockData }) {
  const { symbol, companyName, price, change, changePercent, previousClose, volume, exchange } = stockData;
  const positive = change >= 0;
  const changeColor = positive ? '#16a34a' : '#dc2626';
  const [newsFilter, setNewsFilter] = useState('All');
  const [newsItems, setNewsItems] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    setNewsLoading(true);
    fetchNews(symbol)
      .then(setNewsItems)
      .catch(() => setNewsItems([]))
      .finally(() => setNewsLoading(false));
  }, [symbol]);

  return (
    <div>
      <div style={{ backgroundColor: '#eef2f7', padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '15px', fontWeight: 500, color: '#64748b' }}>{companyName}</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '28px', fontWeight: 700, color: NAVY, letterSpacing: '-0.02em' }}>{symbol}</span>
          <span style={{ fontSize: '28px', fontWeight: 700, color: NAVY }}>${price.toFixed(2)}</span>
          <span style={{ fontSize: '20px', fontWeight: 600, color: changeColor }}>
            {positive ? '+' : ''}{changePercent.toFixed(2)}% ({positive ? '+' : ''}${Math.abs(change).toFixed(2)})
          </span>
        </div>
        <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: '#64748b' }}>
          <span><span style={{ fontWeight: 500, color: NAVY }}>Prev Close: </span>{previousClose != null ? `$${previousClose.toFixed(2)}` : '—'}</span>
          <span><span style={{ fontWeight: 500, color: NAVY }}>Volume: </span>{formatVolume(volume)}</span>
        </div>
      </div>

      <div style={{ padding: '20px 32px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ ...quadrantStyle, width: '60%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 16px 0' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: NAVY }}>Price Chart</span>
            </div>
            <div style={{ margin: '12px 16px 16px', flex: 1, minHeight: `${CHART_HEIGHT}px` }}>
              <TradingViewChart symbol={symbol} exchange={exchange} />
            </div>
          </div>
          <div style={{ ...quadrantStyle, width: '40%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 16px 0' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: NAVY }}>Market Heatmap</span>
            </div>
            <HeatmapWidget />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ ...quadrantStyle, width: '50%' }}>
            <div style={{ padding: '16px 16px 0' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: NAVY, display: 'block', marginBottom: '12px' }}>News Feed</span>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                {NEWS_FILTERS.map((filter) => (
                  <ToggleButton key={filter} label={filter} active={newsFilter === filter} onClick={() => setNewsFilter(filter)} />
                ))}
              </div>
            </div>
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {newsLoading ? (
                <p style={{ fontSize: '14px', color: '#94a3b8' }}>Loading news...</p>
              ) : newsItems.length === 0 ? (
                <p style={{ fontSize: '14px', color: '#94a3b8' }}>No news found for {symbol}.</p>
              ) : (
                newsItems.map((item, i) => (
                  <div key={i} style={{ paddingBottom: i < newsItems.length - 1 ? '20px' : 0, borderBottom: i < newsItems.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      <p style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 600, color: NAVY, lineHeight: 1.4 }}>{item.headline}</p>
                    </a>
                    <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#94a3b8' }}>{item.source} · {item.timestamp}</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>{item.summary}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ ...quadrantStyle, width: '50%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 16px 0' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: NAVY }}>AI Research Summary</span>
            </div>
            <ul style={{ margin: '16px 16px 0', padding: '0 0 0 20px', flex: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {generateBullets(stockData).map((bullet, i) => (
                <li key={i} style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
                  {bullet}
                </li>
              ))}
            </ul>
            <div style={{ padding: '16px 56px' }}>
              <button type="button" className="analyze-btn" style={{ width: '100%', height: '44px', fontSize: '14px', fontWeight: 600, color: '#ffffff', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
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
  const [navTickers, setNavTickers] = useState(TICKER_SYMBOLS.map((symbol) => ({ symbol, changePercent: 0 })));

  useEffect(() => { fetchNavTickers().then(setNavTickers).catch(() => {}); }, []);

  const handleAnalyze = async (symbol) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStockQuote(symbol);
      setStockData(data);
      setNavTickers((prev) => prev.map((t) => t.symbol === data.symbol ? { ...t, changePercent: data.changePercent } : t));
      setView('dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoClick = () => { setView('landing'); setError(null); };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', color: NAVY }}>
      <style>{`
        @keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .ticker-track { animation: ticker-scroll 25s linear infinite; }
        .search-input::placeholder { color: #94a3b8; }
        .search-input:focus { outline: none; border-color: ${NAVY}; box-shadow: 0 0 0 3px rgba(10,15,44,0.08); }
        .analyze-btn { background-color: ${NAVY}; }
        .analyze-btn:hover { background-color: #1e3a7a; }
        .analyze-btn:active { transform: scale(0.98); }
      `}</style>
      <NavBar tickers={navTickers} onLogoClick={view === 'dashboard' ? handleLogoClick : undefined} />
      {view === 'landing' ? (
        <LandingPage ticker={ticker} setTicker={setTicker} onAnalyze={handleAnalyze} loading={loading} error={error} />
      ) : (
        stockData && <StockDashboard stockData={stockData} />
      )}
    </div>
  );
}

export default App;