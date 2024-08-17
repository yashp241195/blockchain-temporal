const mongoose = require('mongoose');
const redis = require('redis');

const DB1="blockchain-workoso" 
const DB2="blockchain-rawopinion" 

const isLocal = false

const MONGO_PASS = process.env.MONGODB_PASS 

const MONGOURI_DB1 = "mongodb+srv://alpha2244:"+MONGO_PASS+"@cluster0.trsdg.mongodb.net/"+DB1+"?retryWrites=true&w=majority&appName=Cluster0"
const MONGOURI_DB2 = "mongodb+srv://alpha2244:"+MONGO_PASS+"@cluster0.trsdg.mongodb.net/"+DB2+"?retryWrites=true&w=majority&appName=Cluster0"

const MONGOURI_LOCAL_DB1 = "mongodb://localhost:27017/"+DB1
const MONGOURI_LOCAL_DB2 = "mongodb://localhost:27017/"+DB2

const redisConnector = {
    LOCAL:{ 
        host: 'localhost', port: 6379, 
        appendonly: 'yes', appendfsync: 'always', 
    },
    SERVER:{ 
        url: 'redis://redis:6379', 
    }
}

const uri1 = isLocal? MONGOURI_LOCAL_DB1: MONGOURI_DB1
const uri2 = isLocal? MONGOURI_LOCAL_DB2: MONGOURI_DB2

const db1 = mongoose.createConnection(
    uri1, { useNewUrlParser: true, useUnifiedTopology: true }
);

const db2 = mongoose.createConnection(
    uri2, { useNewUrlParser: true, useUnifiedTopology: true }
);


db1.once('open', () => { console.log('Connected to mongodb 1'); });
db1.on('error', console.error.bind(console, 'connection error:'));

db2.once('open', () => { console.log('Connected to mongodb 2'); });
db2.on('error', console.error.bind(console, 'connection error:'));

const redisClient = redis.createClient(
    isLocal?redisConnector.LOCAL:redisConnector.SERVER
);

redisClient.connect().then(() => { console.log("connected to Redis")})
.catch((error) => console.error('Redis connection error:', error));


module.exports = { db1, db2, redisClient };

