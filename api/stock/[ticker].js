const YahooFinance = require('yahoo-finance2').default;

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

module.exports = async (req, res) => {
  const ticker = req.query.ticker.toUpperCase();
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
};
