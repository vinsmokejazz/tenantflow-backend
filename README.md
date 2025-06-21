# TenantFlow Backend

A modern CRM SaaS backend built with Node.js, TypeScript, Express, Prisma, and Supabase.

## Features

- 🔐 Authentication & Authorization
- 👥 User Management
- 🏢 Business Management
- 📊 Analytics & Reporting
- 🤖 AI-Powered Insights
- 📈 Lead Management
- 🔄 Follow-up System
- 📱 RESTful API

## Tech Stack

- **Runtime**: Node.js (v18+)
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Authentication**: Supabase Auth
- **AI Integration**: OpenAI
- **Validation**: Zod
- **Testing**: Jest

## Prerequisites

- Node.js v18 or higher
- PostgreSQL database (Supabase recommended)
- Supabase account
- OpenAI API key

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/tenantflow-backend.git
   cd tenantflow-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   NODE_ENV=development
   PORT=3001
   
   # Database Configuration
   DATABASE_URL="postgresql://username:password@localhost:5432/tenantflow?schema=public"
   DIRECT_URL="postgresql://username:password@localhost:5432/tenantflow?schema=public"
   
   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000
   
   # Supabase Configuration
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_ANON_KEY=your-anon-key
   
   # OpenAI Configuration
   OPENAI_API_KEY=your-openai-api-key
   ```

4. Set up the database:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Troubleshooting

### "User no longer exists" Error
This error occurs when:
1. User exists in Supabase but not in your local database
2. Database connection issues
3. Missing environment variables

**Solutions:**
- Ensure all environment variables are set correctly
- Run database migrations: `npm run prisma:migrate`
- Check database connection
- Verify Supabase configuration

### Authentication Issues
- Ensure Supabase service role key is correct
- Check CORS configuration matches frontend URL
- Verify database schema matches Prisma schema

### Database Connection Issues
- Check DATABASE_URL and DIRECT_URL in .env
- Ensure PostgreSQL is running
- Verify database exists and is accessible

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## API Documentation

### Authentication Endpoints
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password/:token` - Reset password

### Protected Endpoints
All other endpoints require authentication via Bearer token.

## Project Structure

```
src/
├── config/         # Configuration files
├── controllers/    # Route controllers
├── middleware/     # Custom middleware
├── models/         # Database models
├── routes/         # API routes
├── services/       # Business logic
├── types/          # TypeScript types
├── validations/    # Request validations
└── index.ts        # Application entry point
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.
