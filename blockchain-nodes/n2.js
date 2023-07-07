const express = require('express');
const { Mutex } = require('async-mutex');
const { getRandomString, getHash, validateData } = require('../commonfn')
const { db1, redisClient } = require('../db')
const mongoose = require('mongoose');

const app = express();

const BLOCKCHAIN_NAME = "blockchain-opinion"
const withNS = (value) => BLOCKCHAIN_NAME+"-"+value

const BlockSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true, default: Date.now },
  data: { type: Object, strict: false, }, previousHash: String, hash: String
});

const Block = db1.model(withNS('block'), BlockSchema);
const mutex = new Mutex();

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.get('/', async (req, res) => {
  try{
    let deploy = await redisClient.get(withNS('deploy')) || false;
    if(deploy){ res.send('deployed'); }
    else{ res.render('n1submit',{hostname:req.hostname}); }
  }
  catch(e){ res.status(500).json({ error: e.message || "INTERNAL_SERVER_ERROR" }); }
});

app.get('/start', async (req, res)=>{
  try{
    let userHash = await redisClient.get(withNS('userHash'));
    if(userHash){ throw Error("BLOCKCHAIN_ALREADY_CREATED") }
    userHash = await getHash(getRandomString(20),getRandomString(20))
    const userSaved = await redisClient.set(withNS('userHash'), userHash);
    if(!userSaved){ throw Error("USER_NOT_SAVED") }
    res.json({userHash:userHash, status:"Success"})
  }
  catch(e){ res.status(500).json({ error: e.message || "INTERNAL_SERVER_ERROR" }); }
})

app.post('/add/contract', async (req, res) => {
  const { data, userHashInput } = req.body;
  try {
    await mutex.acquire();
    let deploy = await redisClient.get(withNS('deploy')) || false;
    if(deploy){throw Error("ALREADY_DEPLOYED")}
    let userHash = await redisClient.get(withNS('userHash'));
    if(userHash !== userHashInput){throw Error("INVALID_USER_HASH") }
    const schema = JSON.parse(data)
    const prevHash = await redisClient.get(withNS('latestHash'));
    const newHash = await getHash(prevHash || "NULL", schema);
    await redisClient.set(withNS('latestHash'), newHash);
    await redisClient.set(withNS('latestContract'), JSON.stringify(schema));
    const newBlock = new Block({ data:schema, previousHash:prevHash, hash:newHash});
    const savedBlock = await newBlock.save();
    if(!savedBlock){throw Error("MONGO_SAVE_FAIL")}
    userHash = await getHash(newHash, getRandomString(14));
    await redisClient.set(withNS('userHash'), userHash);
    res.json({ message:"Success", userHash:userHash });
  } 
  catch(e){ res.status(500).json({ error: e.message || "INTERNAL_SERVER_ERROR" }); }
  finally { mutex.release(); }
});

app.post('/add/data', async (req, res) => {
  const { data, userHashInput } = req.body;
  try {
    await mutex.acquire();
    const hostname = req.hostname;
    const host = await redisClient.get(withNS('hostname'));
    let deploy = await redisClient.get(withNS('deploy')) || false;
    if(deploy && hostname != host){ throw Error("INVALID_INCOMING_SOURCE") }
    let userHash = await redisClient.get(withNS('userHash'));
    if(userHash !== userHashInput){throw Error("INVALID_USER_HASH") }
    const latestContract = await redisClient.get(withNS('latestContract'));
    if(!latestContract){ throw Error("NO_CONTRACT_FOUND") }
    const schema = JSON.parse(latestContract);
    const blockchain_data =  JSON.parse(data)
    const isDataValid = await validateData(blockchain_data, schema);
    if(!isDataValid){ throw Error("INVALID_DATA") }
    const prevHash = await redisClient.get(withNS('latestHash'));
    const newHash = await getHash(prevHash, blockchain_data);
    await redisClient.set(withNS('latestHash'), newHash);
    const newBlock = new Block({ data:blockchain_data, previousHash:prevHash, hash:newHash});
    const savedBlock = await newBlock.save();
    if(!savedBlock){throw Error("MONGO_SAVE_FAIL")}
    res.json({ message:"Success", savedBlock:savedBlock  })
  } 
  catch(e){ res.status(500).json({ error: e.message || "INTERNAL_SERVER_ERROR" }); }
  finally { mutex.release(); }
});

app.get('/view/block/:id', async (req, res) => {
  try {
    const blockId = req.params.id;
    const block = await Block.findOne({ hash: blockId });
    if (!block) { return res.status(404).json({ error: 'Block not found' });}
    let data = {
      "hash":	block.hash,
      "timestamp":Date(block.timestamp),
      "blockchain_data":block.data,
      "previousHash": block.previousHash || "NULL",
    } 
    res.render('n1view', { data });
  } 
  catch(e){ res.status(500).json({ error: e.message || "INTERNAL_SERVER_ERROR" }); }
})

app.get('/block/:id', async (req, res) => {
  try {
    const blockId = req.params.id;
    const block = await Block.findOne({ hash: blockId });
    if (!block) { return res.status(404).json({ error: 'Block not found' });}
    res.json(block);
  } 
  catch(e){ res.status(500).json({ error: e.message || "INTERNAL_SERVER_ERROR" }); }
});

app.get('/blockchain', async (req, res) => {
  try {
    const blocks = await Block.find();
    res.json(blocks);
  } 
  catch(e){ res.status(500).json({ error: e.message || "INTERNAL_SERVER_ERROR" }); }
});

app.post('/deploy', async (req, res) => {
  const hostname = req.body.inputData6;
  try {
    let deploy = await redisClient.get(withNS('deploy')) || false;
    if(deploy){ throw Error("ALREADY_DEPLOYED") }
    const host = await redisClient.set(withNS('hostname'), hostname);
    if(!host){ throw Error("HOST_NOT_SET") }
    deploy = await redisClient.set(withNS('deploy'), 'true');
    if(!deploy){ throw Error("DEPLOY_FAILED") }
    res.json({"hostname":hostname, "deploy":true});
  } 
  catch(e){ 
    res.status(500).json({ error: e.message || "INTERNAL_SERVER_ERROR" }); }
});


module.exports = app;