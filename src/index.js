const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// 会话中间件配置
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 认证中间件
const authMiddleware = (req, res, next) => {
    if (req.session && req.session.authenticated) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
};

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Service is running' });
});

// 登录端点
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            error: '用户名和密码不能为空' 
        });
    }

    if (username === 'admin' && password === 'password') {
        req.session.authenticated = true;
        req.session.username = username;
        res.json({ success: true });
    } else {
        res.status(401).json({ 
            success: false, 
            error: '用户名或密码错误' 
        });
    }
});

// 登出端点
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            res.status(500).json({ error: '登出失败' });
        } else {
            res.json({ success: true });
        }
    });
});

// 认证检查端点
app.get('/check-auth', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.json({ authenticated: true, username: req.session.username });
    } else {
        res.status(401).json({ authenticated: false });
    }
});

// 静态文件路由
app.get('/', (req, res) => {
    if (!req.session || !req.session.authenticated) {
        res.redirect('/login');
    } else {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    }
});

app.get('/login', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname, '../public/login.html'));
    }
});

// 获取用户配置
app.get('/load-config', authMiddleware, async (req, res) => {
    try {
        const configPath = path.join(__dirname, '../data', `${req.session.username}.json`);
        const config = await fs.readFile(configPath, 'utf8').catch(() => '{}');
        res.json(JSON.parse(config));
    } catch (error) {
        res.status(500).send('加载配置失败');
    }
});

// 保存用户配置
app.post('/save-config', authMiddleware, async (req, res) => {
    try {
        const configPath = path.join(__dirname, '../data', `${req.session.username}.json`);
        await fs.writeFile(configPath, JSON.stringify(req.body, null, 2));
        res.sendStatus(200);
    } catch (error) {
        res.status(500).send('保存配置失败');
    }
});

// 处理订阅
app.get('/process', authMiddleware, async (req, res) => {
    try {
        // 读取用户配置
        const configPath = path.join(__dirname, '../data', `${req.session.username}.json`);
        const config = JSON.parse(await fs.readFile(configPath, 'utf8'));

        if (!config.backendUrl || !config.subscriptions) {
            return res.status(400).send('缺少必要的配置信息');
        }

        // 处理订阅地址
        const subscriptionUrls = config.subscriptions
            .split('\n')
            .map(url => url.trim())
            .filter(url => url)
            .map(url => encodeURIComponent(url))
            .join('%0A');

        // 构建请求 URL
        let processUrl = `${config.backendUrl}?config=${subscriptionUrls}`;

        // 如果有链式代理标签，添加到 URL
        if (config.chainTag) {
            processUrl += `&chainTag=${encodeURIComponent(config.chainTag)}`;
        }

        // 添加其他必要的参数
        processUrl += '&selectedRules=[]&customRules=[]&pin=false';

        // 发送请求
        const response = await axios.get(processUrl);
        const configData = response.data;

        // 保存处理后的配置
        const processedPath = path.join(__dirname, '../data', `${req.session.username}_processed.json`);
        await fs.writeFile(processedPath, JSON.stringify(configData, null, 2));

        res.json(configData);
    } catch (error) {
        console.error('处理失败:', error);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        res.status(500).send('处理订阅失败');
    }
});

// 测试订阅
app.get('/testsub', authMiddleware, async (req, res) => {
    try {
        const processedPath = path.join(__dirname, '../data', `${req.session.username}_processed.json`);
        const config = await fs.readFile(processedPath, 'utf8');
        res.json(JSON.parse(config));
    } catch (error) {
        res.status(404).send('未找到生成的配置文件');
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
