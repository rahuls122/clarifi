import { useState, useEffect } from 'react';

const NAVY = '#0a0f2c';
const API_BASE = process.env.REACT_APP_API_BASE || '';
const TICKER_SYMBOLS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'NFLX', 'AMD', 'JPM'];
const CHART_HEIGHT = 280;
const WATCHLIST_KEY = 'clarifi_watchlist';

function getWatchlist() {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY)) || [];
  } catch {
    return [];
  }
}

function saveWatchlist(list) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
}

function getTradingViewSymbol(symbol, exchange) {
  const ETF_OVERRIDES = ['VTI', 'VOO', 'SPY', 'QQQ', 'VXUS', 'BND', 'VEA', 'VWO', 'IVV', 'IWM'];
  if (ETF_OVERRIDES.includes(symbol)) return `AMEX:${symbol}`;

  const hint = (exchange || '').toUpperCase();
  if (hint.includes('NYSE') || hint === 'NYQ') return `NYSE:${symbol}`;
  if (hint.includes('AMEX') || hint.includes('ARCA') || hint.includes('PCX')) return `AMEX:${symbol}`;
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
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString();
}

function formatMarketCap(mc) {
  if (!mc) return null;
  if (mc >= 1e12) return `$${(mc / 1e12).toFixed(2)}T`;
  if (mc >= 1e9) return `$${(mc / 1e9).toFixed(2)}B`;
  return `$${(mc / 1e6).toFixed(2)}M`;
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
  const { symbol, price, changePercent, previousClose, fiftyTwoWeekHigh, fiftyTwoWeekLow, marketCap } = stockData;
  const positive = changePercent >= 0;
  const direction = positive ? 'up' : 'down';
  const sentiment = positive ? 'bullish' : 'bearish';

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

function generateMemo(stockData) {
  const { symbol, companyName, price, changePercent, previousClose, fiftyTwoWeekHigh, fiftyTwoWeekLow, marketCap, volume } = stockData;
  const positive = changePercent >= 0;

  let position = null;
  if (fiftyTwoWeekHigh && fiftyTwoWeekLow) {
    position = ((price - fiftyTwoWeekLow) / (fiftyTwoWeekHigh - fiftyTwoWeekLow) * 100).toFixed(0);
  }
  let rating = 'Hold';
  if (position !== null) {
    if (position < 30 && positive) rating = 'Buy';
    else if (position < 20) rating = 'Buy';
    else if (position > 80 && !positive) rating = 'Sell';
    else if (position > 90) rating = 'Sell';
  }
  return {
    snapshot: `${companyName} (${symbol}) is currently trading at $${price.toFixed(2)}, ${positive ? 'up' : 'down'} ${Math.abs(changePercent).toFixed(2)}% from the previous close of $${previousClose?.toFixed(2) || 'N/A'}. ${marketCap ? `Market capitalization stands at ${formatMarketCap(marketCap)}.` : ''}`,
    bullCase: [
      position !== null && position < 50 ? `Trading at ${position}% of its 52-week range, leaving room for upside if momentum shifts positive.` : `Strong recent performance with price near 52-week highs, signaling continued investor confidence.`,
      volume ? `Trading volume of ${formatVolume(volume)} suggests active market interest and liquidity.` : `Active trading activity suggests sustained market interest.`,
      `Market cap of ${marketCap ? formatMarketCap(marketCap) : 'significant scale'} reflects established market position.`,
    ],
    bearCase: [
      position !== null && position > 70 ? `Trading near 52-week highs at ${position}% of range — potential resistance and profit-taking risk.` : `Below recent highs, which may signal underlying weakness or sector headwinds.`,
      `Daily volatility of ${Math.abs(changePercent).toFixed(2)}% reflects ${Math.abs(changePercent) > 3 ? 'elevated' : 'moderate'} short-term risk.`,
      `Broader macro conditions and sector rotation could impact near-term price action.`,
    ],
    rating,
    verdictText: `This call weighs ${symbol}'s position in its 52-week range (${position ?? 'N/A'}%) against today's ${Math.abs(changePercent).toFixed(2)}% ${positive ? 'gain' : 'decline'} — it does not account for earnings, valuation, or analyst estimates, so treat it as one data point, not a full thesis.`,
  };
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

function DashboardSearch({ onAnalyze }) {
  const [value, setValue] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) {
      onAnalyze(value.trim().toUpperCase());
      setValue('');
    }
  };
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        placeholder="Search another ticker..."
        style={{ fontSize: '13px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', width: '200px', fontFamily: 'inherit', color: NAVY }}
      />
      <button type="submit" style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '8px', border: 'none', backgroundColor: NAVY, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
        Go
      </button>
    </form>
  );
}

function NavBar({ tickers, onLogoClick, onAnalyze, showSearch }) {
  return (
    <nav style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: '0 32px', height: '56px', borderBottom: '1px solid #f1f5f9',
      position: 'sticky', top: 0, backgroundColor: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(8px)', zIndex: 10,
    }}>
      <span onClick={onLogoClick} style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.03em', color: NAVY, cursor: onLogoClick ? 'pointer' : 'default', justifySelf: 'start' }}>
        Clarifi
      </span>

      <div style={{ justifySelf: 'center' }}>
        {showSearch && <DashboardSearch onAnalyze={onAnalyze} />}
      </div>

      <div style={{
        width: '420px', overflow: 'hidden', justifySelf: 'end',
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

function LandingPage({ ticker, setTicker, onAnalyze, loading, error, watchlist, onRemoveWatch }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (ticker.trim() && !loading) onAnalyze(ticker.trim().toUpperCase());
  };
  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 80px', textAlign: 'center', position: 'relative' }}>
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

      {watchlist.length > 0 && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', width: '220px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', padding: '14px', textAlign: 'left' }}>
          <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Watchlist</p>
          {watchlist.map((sym) => (
            <div key={sym} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <button onClick={() => onAnalyze(sym)} style={{ background: 'none', border: 'none', color: NAVY, fontWeight: 600, fontSize: '13px', cursor: 'pointer', padding: 0 }}>
                {sym}
              </button>
              <button onClick={() => onRemoveWatch(sym)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', padding: 0 }}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function StockDashboard({ stockData, onAnalyze }) {
  const { symbol, companyName, price, change, changePercent, previousClose, volume, exchange } = stockData;
  const positive = change >= 0;
  const changeColor = positive ? '#16a34a' : '#dc2626';
  const [newsItems, setNewsItems] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [watchlist, setWatchlist] = useState(getWatchlist());
  const isWatched = watchlist.includes(symbol);
  const memo = generateMemo(stockData);

  useEffect(() => {
    setNewsLoading(true);
    fetchNews(symbol)
      .then(setNewsItems)
      .catch(() => setNewsItems([]))
      .finally(() => setNewsLoading(false));
  }, [symbol]);

  useEffect(() => {
    setWatchlist(getWatchlist());
  }, [symbol]);

  const toggleWatch = () => {
    const updated = isWatched ? watchlist.filter((s) => s !== symbol) : [...watchlist, symbol];
    setWatchlist(updated);
    saveWatchlist(updated);
  };

  return (
    <div style={{ position: 'relative' }}>
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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
          <button
            onClick={toggleWatch}
            style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: isWatched ? NAVY : '#fff', color: isWatched ? '#fff' : NAVY, cursor: 'pointer' }}
          >
            {isWatched ? '★ Watching' : '☆ Add to Watchlist'}
          </button>
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
            <div style={{ padding: '16px 16px 16px', overflowY: 'auto' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: NAVY, display: 'block', marginBottom: '12px' }}>Market Summary</span>

              <ul style={{ margin: '0 0 16px', padding: '0 0 0 18px' }}>
                {generateBullets(stockData).map((bullet, i) => (
                  <li key={i} style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '6px' }}>{bullet}</li>
                ))}
              </ul>

              <p style={{ fontWeight: 700, fontSize: '12px', color: '#16a34a', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bull Case</p>
              <ul style={{ margin: '0 0 14px', padding: '0 0 0 18px' }}>
                {memo.bullCase.map((point, i) => (
                  <li key={i} style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '6px' }}>{point}</li>
                ))}
              </ul>

              <p style={{ fontWeight: 700, fontSize: '12px', color: '#dc2626', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bear Case</p>
              <ul style={{ margin: '0 0 14px', padding: '0 0 0 18px' }}>
                {memo.bearCase.map((point, i) => (
                  <li key={i} style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '6px' }}>{point}</li>
                ))}
              </ul>

              <p style={{ fontWeight: 700, fontSize: '12px', color: NAVY, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verdict</p>
              <p style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 6px', color: memo.rating === 'Buy' ? '#16a34a' : memo.rating === 'Sell' ? '#dc2626' : '#94a3b8' }}>{memo.rating}</p>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, margin: '0 0 4px' }}>{memo.verdictText}</p>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Data-driven analysis. Not financial advice.</p>
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
  const [watchlist, setWatchlist] = useState(getWatchlist());

  useEffect(() => { fetchNavTickers().then(setNavTickers).catch(() => {}); }, []);
  useEffect(() => { setWatchlist(getWatchlist()); }, [view]);

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

  const handleRemoveWatch = (sym) => {
    const updated = watchlist.filter((s) => s !== sym);
    setWatchlist(updated);
    saveWatchlist(updated);
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
      <NavBar
        tickers={navTickers}
        onLogoClick={view === 'dashboard' ? handleLogoClick : undefined}
        onAnalyze={handleAnalyze}
        showSearch={view === 'dashboard'}
      />
      {view === 'landing' ? (
        <LandingPage
          ticker={ticker}
          setTicker={setTicker}
          onAnalyze={handleAnalyze}
          loading={loading}
          error={error}
          watchlist={watchlist}
          onRemoveWatch={handleRemoveWatch}
        />
      ) : (
        stockData && <StockDashboard stockData={stockData} onAnalyze={handleAnalyze} />
      )}
    </div>
  );
}

export default App;