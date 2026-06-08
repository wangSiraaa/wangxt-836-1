import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { UserRepository } from '../repositories/UserRepository.js';
import { LoginRequest, LoginResponse, User, UserRole } from '../../shared/types.js';

export class AuthService {
  private userRepo: UserRepository;
  private db: Database.Database;
  private tokens: Map<string, { user: User; expires: Date }> = new Map();

  constructor(db: Database.Database) {
    this.db = db;
    this.userRepo = new UserRepository(db);
    this.startTokenCleanup();
  }

  login(req: LoginRequest): LoginResponse {
    const userWithPassword = this.userRepo.findByUsername(req.username);
    if (!userWithPassword) {
      throw new Error('用户名或密码错误');
    }

    const passwordMatch = bcrypt.compareSync(req.password, userWithPassword.passwordHash);
    if (!passwordMatch) {
      throw new Error('用户名或密码错误');
    }

    const token = this.generateToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { passwordHash, ...user } = userWithPassword;
    this.tokens.set(token, { user, expires });

    return { user, token };
  }

  validateToken(token: string): User | null {
    const entry = this.tokens.get(token);
    if (!entry) {
      return null;
    }
    if (entry.expires < new Date()) {
      this.tokens.delete(token);
      return null;
    }
    return entry.user;
  }

  logout(token: string): void {
    this.tokens.delete(token);
  }

  hasPermission(user: User, permission: string): boolean {
    if (user.permissions.includes('*')) {
      return true;
    }
    return user.permissions.includes(permission);
  }

  hasRole(user: User, roles: UserRole[]): boolean {
    return roles.includes(user.role);
  }

  getAllUsers(): User[] {
    return this.userRepo.findAll();
  }

  getUserById(id: string): User | null {
    return this.userRepo.findById(id);
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private startTokenCleanup(): void {
    setInterval(() => {
      const now = new Date();
      for (const [token, entry] of this.tokens.entries()) {
        if (entry.expires < now) {
          this.tokens.delete(token);
        }
      }
    }, 60 * 60 * 1000);
  }
}
