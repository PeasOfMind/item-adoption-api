'use strict';

require('dotenv').config();

const express = require('express');
const app = express();

const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const passport = require('passport');

mongoose.Promise = global.Promise;

const {router: listRouter} = require('./lists');
const {router: userRouter} = require('./users');
const {router: authRouter, localStrategy, jwtStrategy} = require('./auth');
const {CLIENT_ORIGIN, PORT, DATABASE_URL} = require('./config');

app.use(morgan('common'));
app.use(express.json());

app.use(
    cors({
        origin: CLIENT_ORIGIN
    })
);

passport.use(localStrategy);
passport.use(jwtStrategy);

app.use('/api/lists/', listRouter);
app.use('/api/users/', userRouter);
app.use('/api/auth/', authRouter);

app.use('*', (req, res) => {
    return res.status(404).json({message: 'Not Found'});
});

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