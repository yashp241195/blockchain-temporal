const express = require('express');
const bodyParser = require('body-parser');
const vhost = require('vhost');
const cors = require('cors')
require('dotenv').config();

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(vhost('blockchain.workoso.in', require('./blockchain-nodes/n1.js')));
app.use(vhost('blockchain.rawopinion.in', require('./blockchain-nodes/n2.js')));


app.listen(3000, () => { console.log('Server is running on port 3000'); });
