module.exports = async (req, res) => {
    const ticker = req.query.ticker.toUpperCase();
    const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
  
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
  };