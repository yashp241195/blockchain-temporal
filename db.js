const mongoose = require('mongoose');
const redis = require('redis');
const dbpassword = process.env.MONGOPASSWORD

const uri1 = 'mongodb+srv://alpha2244:'+dbpassword+'@cluster0.trsdg.mongodb.net/blockchain-work-db';
const uri2 = 'mongodb+srv://alpha2244:'+dbpassword+'@cluster0.trsdg.mongodb.net/blockchain-opinion-db';

const db1 = mongoose.createConnection(uri1, { useNewUrlParser: true, useUnifiedTopology: true });
const db2 = mongoose.createConnection(uri2, { useNewUrlParser: true, useUnifiedTopology: true });

const redisClient = redis.createClient({ host: '127.0.0.1', port: 6379, appendonly: 'yes', appendfsync: 'always', });
redisClient.connect().then(() => { console.log("connected to Redis")})
.catch((error) => console.error('Redis connection error:', error));


module.exports = { db1, db2, redisClient };
