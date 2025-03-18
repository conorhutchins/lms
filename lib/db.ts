import pkg from 'pg';
const { Pool } = pkg;

import dotenv from 'dotenv'; // import dotenv to handle environment variables
// all this is doing is loading environment variables from the .env file
dotenv.config();

// create a new pool of connection to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // this obviously comes from the .env file
  ssl: { rejectUnauthorized: false } // this is to avoid SSL errors
});
// exporting to use in other files
export default pool;
