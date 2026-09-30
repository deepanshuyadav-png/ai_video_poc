import pool from '../config/db';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  email: string;
  password?: string;
  name?: string;
  role: string;
  created_at: Date;
}

const UserModel = {
  async create(email: string, password: string, role: string = 'user'): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at',
      [email, hashedPassword, role]
    );
    return result.rows[0];
  },

  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  async findById(id: number): Promise<User | null> {
    const result = await pool.query('SELECT id, email, name, role, created_at FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
};

export default UserModel;
