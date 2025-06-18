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
- **Authentication**: JWT
- **AI Integration**: OpenAI
- **Validation**: Zod
- **Testing**: Jest

## Prerequisites

- Node.js v18 or higher
- PostgreSQL database
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
   cp .env.example .env
   ```
   Edit `.env` with your configuration.

4. Set up the database:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

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

API documentation is available at `/api-docs` when running the server.

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
