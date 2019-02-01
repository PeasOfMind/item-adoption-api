'use strict';

require('dotenv').config();

const express = require('express');
const app = express();

const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');

mongoose.Promise = global.Promise;

const {router: listRouter} = require('./lists');
const {CLIENT_ORIGIN, PORT, DATABASE_URL} = require('./config');

app.use(morgan('common'));
app.use(express.json());

app.use(
    cors({
        origin: CLIENT_ORIGIN
    })
);

app.use('/api/lists/', listRouter)

// app.get('/api/*', (req, res) => {
//     res.json({ok: true});
// });

let server;

function runServer(databaseUrl, port = PORT){
    return new Promise((resolve, reject) => {
        mongoose.connect(databaseUrl, err => {
            if(err){
                return reject(err);
            }
            server = app.listen(port, () => {
                console.log(databaseUrl);
                console.log(`Listening on port ${port}`);
                resolve();
            })
            .on('error', err => {
                mongoose.disconnect();
                reject(err);
            });
        });
    });
}

function closeServer(){
    return mongoose.disconnect().then(() => {
        return new Promise((resolve, reject) => {
            console.log('Closing server');
            server.close(err => {
                if(err) {
                    return reject(err);
                }
                resolve();
            });
        });
    });
}

if (require.main === module){
    runServer(DATABASE_URL).catch(err => console.error(err));
}

module.exports = {app, runServer, closeServer};