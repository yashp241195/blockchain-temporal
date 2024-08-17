const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors')
require('dotenv').config();

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res)=>{ res.send('<div>Welcome !!</div>'); });
app.use('/workoso', require('./blockchain-nodes/node1/node.js'));
app.use('/rawopinion', require('./blockchain-nodes/node2/node.js'));

app.listen(3000, () => { console.log('Server is running on port 3000'); });

