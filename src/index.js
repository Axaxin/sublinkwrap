const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const session = require('express-session');
const Redis = require('redis');
const RedisStore = require('connect-redis').default;
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Redis 客户端设置
const redisClient = Redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect().catch(console.error);

// Session 中间件设置
app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000 // 1小时
    }
}));

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 用户认证中间件
const auth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).send('未登录');
    }
};

// 登录路由
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    // 这里应该使用环境变量或配置文件存储用户信息
    if (username === 'admin' && password === 'password') {
        req.session.user = username;
        res.sendStatus(200);
    } else {
        res.status(401).send('用户名或密码错误');
    }
});

// 检查登录状态
app.get('/check-auth', auth, (req, res) => {
    res.sendStatus(200);
});

// 退出登录
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.sendStatus(200);
});

// 获取用户配置
app.get('/load-config', auth, async (req, res) => {
    try {
        const configPath = path.join(__dirname, '../data', `${req.session.user}.json`);
        const config = await fs.readFile(configPath, 'utf8').catch(() => '{}');
        res.json(JSON.parse(config));
    } catch (error) {
        res.status(500).send('加载配置失败');
    }
});

// 保存用户配置
app.post('/save-config', auth, async (req, res) => {
    try {
        const configPath = path.join(__dirname, '../data', `${req.session.user}.json`);
        await fs.writeFile(configPath, JSON.stringify(req.body, null, 2));
        res.sendStatus(200);
    } catch (error) {
        res.status(500).send('保存配置失败');
    }
});

// 处理订阅
app.get('/process', auth, async (req, res) => {
    try {
        // 读取用户配置
        const configPath = path.join(__dirname, '../data', `${req.session.user}.json`);
        const config = JSON.parse(await fs.readFile(configPath, 'utf8'));

        if (!config.backendUrl || !config.subscriptions) {
            return res.status(400).send('缺少必要的配置信息');
        }

        // 构建请求URL
        const subscriptions = config.subscriptions
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean)
            .map(encodeURIComponent)
            .join('\n');

        const url = `${config.backendUrl}/singbox?config=${encodeURIComponent(subscriptions)}&selectedRules=%5B%5D&customRules=%5B%5D&pin=false`;

        // 发送请求获取配置
        const response = await axios.get(url);
        let configData = response.data;

        // 如果有链式代理tag，添加detour
        if (config.chainTag) {
            if (configData.outbounds) {
                configData.outbounds = configData.outbounds.map(outbound => ({
                    ...outbound,
                    detour: [config.chainTag]
                }));
            }
        }

        // 保存处理后的配置
        const processedPath = path.join(__dirname, '../data', `${req.session.user}_processed.json`);
        await fs.writeFile(processedPath, JSON.stringify(configData, null, 2));

        res.json(configData);
    } catch (error) {
        console.error('处理失败:', error);
        res.status(500).send(error.message);
    }
});

// 测试订阅
app.get('/testsub', auth, async (req, res) => {
    try {
        const processedPath = path.join(__dirname, '../data', `${req.session.user}_processed.json`);
        const config = await fs.readFile(processedPath, 'utf8');
        res.json(JSON.parse(config));
    } catch (error) {
        res.status(404).send('未找到生成的配置文件');
    }
});

// 主页路由
app.get('/', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    } else {
        res.redirect('/login');
    }
});

// 登录页面路由
app.get('/login', (req, res) => {
    if (req.session.user) {
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname, '../public/login.html'));
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
