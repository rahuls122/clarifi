const express = require('express');
const cors = require('cors');
const YahooFinance = require('yahoo-finance2').default;

const app = express();
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const PORT = process.env.PORT || 5000;

app.use(cors());

app.get('/api/stock/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();

  try {
    const quote = await yahooFinance.quote(ticker);

    if (!quote?.regularMarketPrice) {
      return res.status(404).json({
        message: `Could not find data for "${ticker}". Please check the ticker and try again.`,
      });
    }

    res.json({
      symbol: quote.symbol || ticker,
      companyName: quote.longName || quote.shortName || ticker,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange ?? 0,
      changePercent: quote.regularMarketChangePercent ?? 0,
      previousClose: quote.regularMarketPreviousClose ?? null,
      volume: quote.regularMarketVolume ?? quote.volume ?? null,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? null,
      marketCap: quote.marketCap ?? null,
    });
  } catch (error) {
    console.error(`Error fetching quote for ${ticker}:`, error.message);
    res.status(404).json({
      message: `Could not find data for "${ticker}". Please check the ticker and try again.`,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Clarifi API running on http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} is already in use. On macOS, disable AirPlay Receiver in System Settings, or run PORT=5001 node server.js`
    );
    process.exit(1);
  }
  throw err;
});
