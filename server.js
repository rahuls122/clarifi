const express = require('express');
const cors = require('cors');
const YahooFinance = require('yahoo-finance2').default;
require('dotenv').config();

const app = express();
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const PORT = process.env.PORT || 3002;
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

async function fetchJson(url) {
  const response = await fetch(url);
  return response.json();
}

app.use(cors());

// Stock quote endpoint
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
      exchange: quote.fullExchangeName || quote.exchange || null,
    });
  } catch (error) {
    console.error(`Error fetching quote for ${ticker}:`, error.message);
    res.status(404).json({
      message: `Could not find data for "${ticker}". Please check the ticker and try again.`,
    });
  }
});

// News endpoint
app.get('/api/news/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  try {
    const today = new Date().toISOString().split('T')[0];
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const url = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${lastMonth}&to=${today}&token=${FINNHUB_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return res.json([]);
    }

    // Return top 10 most recent articles
    const articles = data.slice(0, 10).map((item) => ({
      headline: item.headline,
      source: item.source,
      timestamp: new Date(item.datetime * 1000).toLocaleDateString(),
      summary: item.summary,
      url: item.url,
    }));

    res.json(articles);
  } catch (error) {
    console.error(`Error fetching news for ${ticker}:`, error.message);
    res.status(500).json({ message: 'Failed to fetch news.' });
  }
});

// AI Summary endpoint using Gemini
app.get('/api/summary/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  try {
    const quote = await yahooFinance.quote(ticker);

    const prompt = `You are a financial analyst. Given the following stock data, write exactly 3 concise bullet points of investment analysis for ${ticker}. Be specific, use the numbers provided, and keep each bullet under 30 words.

Stock: ${quote.companyName} (${ticker})
Price: $${quote.regularMarketPrice ?? 'N/A'}
Change: ${quote.regularMarketChangePercent?.toFixed(2) ?? 'N/A'}%
Previous Close: $${quote.regularMarketPreviousClose ?? 'N/A'}
Volume: ${quote.regularMarketVolume ?? 'N/A'}
52-Week High: $${quote.fiftyTwoWeekHigh ?? 'N/A'}
52-Week Low: $${quote.fiftyTwoWeekLow ?? 'N/A'}
Market Cap: $${quote.marketCap ?? 'N/A'}

Return ONLY the 3 bullet points, no intro text, no labels. Start each with a •`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    console.log('Gemini raw response:', JSON.stringify(data, null, 2));
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Extracted text:', text);
    const bullets = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[•\-\*]\s*/, '').trim())
    .filter((line) => line.length > 10)
    .slice(0, 3);

    res.json({ bullets });
  } catch (error) {
    console.error('Gemini error:', error.message);
    res.status(500).json({ message: 'Failed to generate AI summary.' });
  }
});


app.listen(PORT, () => {
  console.log(`Clarifi API running on http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    process.exit(1);
  }
  throw err;
});