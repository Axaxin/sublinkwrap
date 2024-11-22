const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Service is running' });
});

app.get('/mysub', async (req, res) => {
  try {
    const targetUrl = 'https://sublink-worker.grizzly-chan.workers.dev/singbox?config=https%3A%2F%2Fracksuisub.metacorn.cc%2Fracksuisub%2Fjkrack%0Ahttps%3A%2F%2Fsubeu.metacorn.cc%2Fsubde%2Fstargazer&selectedRules=%5B%5D&customRules=%5B%5D&pin=false';

    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        'Accept': 'application/json,text/plain,*/*',
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching data:', error.message);
    res.status(500).json({
      error: 'Failed to fetch data',
      message: error.message,
      details: {
        timestamp: new Date().toISOString(),
        errorType: error.name
      }
    });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
