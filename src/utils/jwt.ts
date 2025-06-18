import jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';

const config = {
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '7d' as const
  }
};

export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  businessId: string;
  iat?: number;
  exp?: number;
}

export const signToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.expiresIn
  };
  return jwt.sign(payload, config.jwt.secret, options);
}; 