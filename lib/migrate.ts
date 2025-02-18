import pool from './db';

const migrate = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        password VARCHAR(255) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS fixtures (
        id SERIAL PRIMARY KEY,
        home_team VARCHAR(255),
        away_team VARCHAR(255),
        match_date TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS predictions (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        fixture_id INT REFERENCES fixtures(id),
        team VARCHAR(255),
        result VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        amount DECIMAL(10, 2),
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS competition (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        sport VARCHAR(100),
        round INT,
        selected_teams TEXT[],
        status VARCHAR(50),
        prize_fund DECIMAL(10, 2)
      );
    `);

    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrate();
