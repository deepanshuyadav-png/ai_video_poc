import pool from './config/db';
import bcrypt from 'bcryptjs';

export const ensureSchema = async (): Promise<void> => {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true');
    console.log('Schema ensured: users.is_active');
  } catch (error) {
    console.error('Error ensuring schema:', error);
  }
};

export const seedAdmin = async (): Promise<void> => {
  try {
    const email = 'admin@example.com';
    const password = 'admin123';

    // Check if admin exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existing.rows.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
      [email, hashedPassword, 'admin']
    );

    console.log('Admin user created:');
    console.log('  Email: admin@example.com');
    console.log('  Password: admin123');
  } catch (error) {
    console.error('Error seeding admin:', error);
  }
};
