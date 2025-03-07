const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 使用连接池
const pool = mysql.createPool({
    host: '123.57.11.46',
    user: 'faithbillion',
    password: 'faith_vpixel',
    database: '物料管理'
});

// 封装数据库查询函数，使用连接池并添加重试机制
async function queryDatabase(sql, values = [], maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            return await new Promise((resolve, reject) => {
                pool.query(sql, values, (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                });
            });
        } catch (err) {
            console.warn(`查询出错，重试第 ${retries + 1} 次，错误信息:`, err.message);
            retries++;
        }
    }
    throw new Error(`经过 ${maxRetries} 次重试后，查询仍然失败，错误信息: ${err.message}`);
}

// 获取所有数据接口
app.get('/api/data', async (req, res) => {
    try {
        let sql = 'SELECT * FROM `LED出入库记录` WHERE 1=1';
        let values = [];
        if (req.query.date) {
            sql += ' AND time = ?';
            values.push(req.query.date);
        }
        if (req.query.type) {
            sql += ' AND chip_type = ?';
            values.push(req.query.type);
        }
        if (req.query.wafer_number) sql += ` AND wafer_number = '${req.query.wafer_number}'`; // 新增筛选条件
        const results = await queryDatabase(sql, values);
        res.json(results);
    } catch (err) {
        console.error('查询数据时出错:', err.message);
        res.status(500).json({ error: '查询数据时出错，请稍后再试' });
    }
});

// 获取芯片型号接口
app.get('/api/types', async (req, res) => {
    try {
        const sql = 'SELECT DISTINCT chip_type FROM `LED出入库记录`';
        const results = await queryDatabase(sql);
        res.json(results.map(item => item.chip_type));
    } catch (err) {
        console.error('查询芯片型号时出错:', err.message);
        res.status(500).json({ error: `查询芯片型号失败，原始错误：${err.message}` });
    }
});
// 获取所有不同的wafer编号接口
app.get('/api/waferNumbers', async (req, res) => {
    try {
        const sql = 'SELECT DISTINCT wafer_number FROM `LED出入库记录`';
        const results = await queryDatabase(sql);
        res.json(results.map(item => item.wafer_number || '')); // 处理可能的null值
    } catch (err) {
        console.error('查询wafer编号时出错:', err.message);
        res.status(500).json({ error: `查询wafer编号失败，原始错误：${err.message}` });
    }
});
// 提交数据接口
app.post('/api/submit', async (req, res) => {
    try {
        const { chip_type, operation, wafer_quantity } = req.body;
        const sql = 'INSERT INTO `LED出入库记录` (chip_type, operation, wafer_quantity, time) VALUES (?, ?, ?, NOW())';
        await queryDatabase(sql, [chip_type, operation, wafer_quantity]);
        res.json({ message: '提交成功' });
    } catch (err) {
        console.error('提交数据时出错:', err.message);
        res.status(500).json({ error: '提交数据时出错，请稍后再试' });
    }
});

app.listen(3001, () => {
    console.log('后端运行在 http://localhost:3001');
});