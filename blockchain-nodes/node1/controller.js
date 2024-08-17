const { Mutex } = require('async-mutex');
const { getRandomString, getHash, validateData } = require('../utils')
const { db1, redisClient } = require('../../database')
const mongoose = require('mongoose');

const BLOCKCHAIN_NAME = "blockchain-workoso"
const withNS = (value) => BLOCKCHAIN_NAME+"-"+value

const BlockSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true, default: Date.now },
  data: { type: Object, strict: false, }, 
  previousHash: String, hash: String
});

const Block = db1.model('block', BlockSchema);
const mutex = new Mutex();


const homeController = async (req, res) => {
    try{
        res.render('node'); 
    }
    catch(e){ 
        res.status(500).json({ error: e.message || "INTERNAL_SERVER_ERROR" }); 
    }
}


const viewblockById = async (req, res) => {
    try {
        
        const blockId = req.params.id;
        const block = await Block.findOne({ hash: blockId });
        if (!block) { return res.status(404).json({ error: 'Block not found' });}
        
        let data = {
            "hash":	block.hash, "timestamp":Date(block.timestamp),
            "blockchain_data":block.data,
            "previousHash": block.previousHash || "NULL",
        } 
        
        res.render('nodeView', { data });
    } 
    catch(e){ res.status(500).json({ error: e.message || "INTERNAL_SERVER_ERROR" }); }
}

const blockbyIdController = async (req, res) => {
    try {
        const blockId = req.params.id;
        const block = await Block.findOne({ hash: blockId });
        if (!block) { return res.status(404).json({ error: 'Block not found' });}
        res.json(block);
    } 
    catch(e){ res.status(500).json({ error: e.message || "INTERNAL_SERVER_ERROR" }); }
}

const blockchainController = async (req, res) => {
    try {
        const blocks = await Block.find();
        res.json(blocks);
    } 
    catch(e){ res.status(500).json({ error: e.message || "INTERNAL_SERVER_ERROR" }); }
}


const saveBlockToDB = async (data, previousHash, hash) => {
    const newBlock = new Block({ data, previousHash, hash });
    const savedBlock = await newBlock.save();
    if (!savedBlock) throw Error("MONGO_SAVE_FAIL");
    return savedBlock;
};


const startController = async (req, res) => {
    
    try {
        const userHash = await redisClient.get(withNS('userHash'));
        if (userHash) throw new Error("BLOCKCHAIN_ALREADY_CREATED");
        const randomHash = await getHash(getRandomString(20), getRandomString(20));
        const userHashSave = await redisClient.set(withNS('userHash'), randomHash)
        if(!userHashSave){throw Error("USER_HASH_SAVE_FAILED")}
        res.json({ userHash: randomHash, status: "success" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};


const addContract = async (req, res) => {

    const { data, userHashInput } = req.body;
    if (!data || !userHashInput) return res.status(400).json({ error: "INVALID_INPUT" });

    try {
        
        await mutex.acquire();

        const deploy = await redisClient.get(withNS('deploy'));         
        if(deploy) throw Error("ALREADY_DEPLOYED");

        const userHash = await redisClient.get(withNS('userHash'));         
        if(userHash !== userHashInput) throw Error("INVALID_USER");

        const schema = JSON.parse(data);

        const prevHash = await redisClient.get(withNS('latestHash'));
        const newHash = await getHash(prevHash, schema);

        const transact = await redisClient.multi()
                            .set(withNS('latestHash'), newHash)
                            .set(withNS('latestContract'), JSON.stringify(schema))
                            .set(withNS('deploy'), "true") 
                        .exec();

        if (transact[0] !== "OK" || transact[1] !== "OK" || transact[2] !== "OK") {
            throw new Error("TRANSACTION_FAILED");
        }

        await saveBlockToDB(schema, prevHash, newHash);
        
        res.json({ message: "Success", userHash: userHash });

    } catch (e) {
        res.status(500).json({ error: e.message || "INTERNAL_SERVER_ERROR" });
    } finally {
        mutex.release();
    }
};

const addByData = async (req, res) => {

    const { data, userHashInput } = req.body;
    if (!data || !userHashInput) return res.status(400).json({ error: "INVALID_INPUT" });

    try {
        
        await mutex.acquire();
        
        const deploy = await redisClient.get(withNS('deploy'));
        if (!deploy) throw Error(`CONTRACT_NOT_DEPLOYED`);

        const userHash = await redisClient.get(withNS('userHash'));
        if(userHashInput !== userHash) throw Error("INCORRECT_USER_HASH");
            
        const latestContract = await redisClient.get(withNS('latestContract'));
        if (!latestContract) throw Error("NO_CONTRACT_FOUND");

        const schema = JSON.parse(latestContract);
        const blockchainData = JSON.parse(data);

        if (!await validateData(blockchainData, schema)) throw Error("INVALID_DATA");

        const prevHash = await redisClient.get(withNS('latestHash'));

        const newHash = await getHash(prevHash, blockchainData);
        
        await redisClient.set(withNS('latestHash'), newHash);

        const savedBlock = await saveBlockToDB(blockchainData, prevHash, newHash);        
        
        res.json({ message: "Success", savedBlock });

    } catch (e) {
        res.status(500).json({ error: e.message || "INTERNAL_SERVER_ERROR" });
    } finally {
        mutex.release();
    }
};

module.exports = {
    homeController, startController, 
    blockchainController, blockbyIdController, viewblockById,
    addByData, addContract, 
}  
