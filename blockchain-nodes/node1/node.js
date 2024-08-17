const express = require('express');

const {
  homeController, startController, 
  blockchainController, blockbyIdController, 
  viewblockById, addByData, addContract
} = require('./controller')

const app = express();

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');


app.get('/', homeController);
app.get('/start', startController);
app.post('/add/contract', addContract);
app.post('/add/data', addByData);
app.get('/view/block/:id', viewblockById);
app.get('/block/:id', blockbyIdController);
app.get('/blockchain', blockchainController);


module.exports = app;