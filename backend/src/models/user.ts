import pool from '../config/db';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  email: string;
  password?: string;
  name?: string;
  role: string;
  is_active: boolean;
  created_at: Date;
}

const UserModel = {
  async create(email: string, password: string, role: string = 'user'): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role, is_active, created_at',
      [email, hashedPassword, role]
    );
    return result.rows[0];
  },

  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  async findById(id: number): Promise<User | null> {
    const result = await pool.query('SELECT id, email, name, role, is_active, created_at FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findAll(): Promise<User[]> {
    const result = await pool.query('SELECT id, email, name, role, is_active, created_at FROM users ORDER BY created_at DESC');
    return result.rows;
  },

  async updateRole(id: number, role: string): Promise<User | null> {
    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name, role, is_active, created_at',
      [role, id]
    );
    return result.rows[0] || null;
  },

  async setActive(id: number, isActive: boolean): Promise<User | null> {
    const result = await pool.query(
      'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name, role, is_active, created_at',
      [isActive, id]
    );
    return result.rows[0] || null;
  },

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  },

  async countActiveAdmins(): Promise<number> {
    const result = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = true");
    return parseInt(result.rows[0].count, 10);
  },

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
};

export default UserModel;
