const mongoose = require('mongoose')
const config = require('./config');

const dbOptions = {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  user: config.DB.USER,
  pass: config.DB.PASSWORD
};

mongoose.connect(config.DB.URI, dbOptions);

const connection = mongoose.connection;

connection.once('open', () => {
  console.log('MongoDB: Connection is ready.');
});

connection.on('error', (err: Error) => {
  console.log('MongoDB: Connection error:', err);
  process.exit(0);
});