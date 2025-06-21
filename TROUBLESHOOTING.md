# Backend Troubleshooting Guide

## Recent Fixes Applied

### API Endpoint Mismatches (Fixed)
- **Issue**: Frontend calling non-existent endpoints
- **Fixed**: Updated frontend API client to match backend routes
- **Changes**:
  - Analytics: `/analytics/dashboard` → `/analytics/dashboard/:businessId`
  - Contacts: `/contacts` → `/clients` (backend uses "clients" terminology)
  - Follow-ups: Fixed form data format to match backend validation

### Follow-ups Validation (Fixed)
- **Issue**: Date format mismatch between frontend and backend
- **Fixed**: Convert date input to ISO string before sending to backend
- **Backend expects**: `dueDate` as ISO datetime string
- **Frontend now sends**: `new Date(form.dueDate).toISOString()`

### Missing Backend Routes
The following frontend pages are calling endpoints that don't exist in the backend:
- `/deals` - No backend route exists
- `/reports` - No backend route exists  
- `/ai-insights` - No backend route exists
- `/user/audit-log` - No backend route exists

**Solution**: Either create these routes in the backend or update frontend to use existing endpoints.

## Current API Routes Available

### Authentication
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/refresh`

### Business Management
- `GET /api/v1/business`
- `POST /api/v1/business`
- `PUT /api/v1/business`

### Clients (Contacts)
- `GET /api/v1/clients`
- `GET /api/v1/clients/:id`
- `POST /api/v1/clients`
- `PUT /api/v1/clients/:id`
- `DELETE /api/v1/clients/:id`

### Follow-ups
- `GET /api/v1/followUp`
- `GET /api/v1/followUp/:id`
- `POST /api/v1/followUp`
- `PUT /api/v1/followUp/:id`
- `DELETE /api/v1/followUp/:id`

### Leads
- `GET /api/v1/leads`
- `GET /api/v1/leads/:id`
- `POST /api/v1/leads`
- `PUT /api/v1/leads/:id`
- `DELETE /api/v1/leads/:id`

### Analytics (Require businessId)
- `GET /api/v1/analytics/dashboard/:businessId`
- `GET /api/v1/analytics/pipeline/:businessId`
- `GET /api/v1/analytics/conversion/:businessId`
- `GET /api/v1/analytics/predictions/:businessId`

### User Management
- `GET /api/v1/user`
- `PUT /api/v1/user`

## Common Issues

### 1. "Route not found" errors
**Cause**: Frontend calling endpoints that don't exist
**Solution**: Check the route list above and update frontend API calls

### 2. Validation errors
**Cause**: Request data doesn't match backend validation schemas
**Solution**: 
- Check validation schemas in `/src/validations/`
- Ensure frontend sends data in correct format
- Use proper date formats (ISO strings for dates)

### 3. Authentication errors
**Cause**: Missing or invalid JWT token
**Solution**:
- Ensure token is set in API client: `apiClient.setToken(token)`
- Check token expiration
- Verify token format: `Bearer <token>`

### 4. Business ID required errors
**Cause**: Analytics endpoints require businessId parameter
**Solution**: Get businessId from user context and pass to API calls

## Debugging Steps

1. **Check backend logs** for detailed error messages
2. **Verify API endpoints** match between frontend and backend
3. **Validate request data** against backend schemas
4. **Check authentication** token is properly set
5. **Test with Postman** to isolate frontend vs backend issues

## Environment Setup

Ensure these environment variables are set:
```bash
# Database
DATABASE_URL="postgresql://..."

# JWT
JWT_SECRET="your-secret-key"

# CORS
CORS_ORIGIN="http://localhost:3000"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

## Database Issues

If you encounter database errors:
1. Run migrations: `npm run migrate`
2. Check Prisma schema: `npx prisma validate`
3. Reset database: `npx prisma db push --force-reset` (⚠️ destroys data)

## 🔍 **"User no longer exists" Error**

### **Problem:**
Users can authenticate with Supabase but get "User no longer exists" error when accessing protected routes.

### **Root Cause:**
Users exist in Supabase but not in your local database. This happens when:
- Users were created directly in Supabase dashboard
- Database migrations haven't been run
- There's a mismatch between Supabase and local database

### **Solutions:**

#### **Option 1: Auto-Create Missing Users (Recommended)**
The login function now automatically creates missing users in your local database. Simply try logging in again - it should work automatically.

#### **Option 2: Manual User Sync**
If you have existing users in Supabase, sync them to your local database:

```bash
# Start your server
npm run dev

# In another terminal, call the sync endpoint
curl -X POST http://localhost:3001/api/v1/auth/sync-users
```

#### **Option 3: Database Reset**
If you want to start fresh:

```bash
# Reset database (WARNING: This will delete all data)
npx prisma migrate reset

# Run migrations
npm run migrate

# Start server
npm run dev
```

## 🗄️ **Database Connection Issues**

### **Problem:**
Cannot connect to database or migrations fail.

### **Solutions:**

1. **Check Environment Variables:**
   ```bash
   # Ensure these are set in .env
   DATABASE_URL="postgresql://username:password@localhost:5432/tenantflow?schema=public"
   DIRECT_URL="postgresql://username:password@localhost:5432/tenantflow?schema=public"
   ```

2. **Verify Database is Running:**
   ```bash
   # For local PostgreSQL
   sudo systemctl status postgresql
   
   # For Supabase
   # Check your Supabase dashboard
   ```

3. **Test Connection:**
   ```bash
   # Test with psql
   psql "postgresql://username:password@localhost:5432/tenantflow"
   ```

## 🔐 **Authentication Issues**

### **Problem:**
Users cannot log in or register.

### **Solutions:**

1. **Check Supabase Configuration:**
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Verify CORS Settings:**
   ```env
   CORS_ORIGIN=http://localhost:3000
   ```

3. **Check Supabase Auth Settings:**
   - Go to Supabase Dashboard > Authentication > Settings
   - Ensure email confirmation is disabled for development
   - Check redirect URLs

## 🚀 **Setup Issues**

### **Problem:**
Setup script fails or environment is not configured.

### **Solutions:**

1. **Run Interactive Setup:**
   ```bash
   npm run setup
   ```

2. **Manual Environment Setup:**
   ```bash
   cp env.example .env
   # Edit .env with your values
   ```

3. **Database Setup:**
   ```bash
   npm run migrate
   ```

## 📊 **Common Error Messages**

### **"Invalid token"**
- Check if Supabase service role key is correct
- Verify token format in Authorization header

### **"User not found in system"**
- User exists in Supabase but not local database
- Try logging in again (auto-creation should work)
- Or run user sync: `POST /api/v1/auth/sync-users`

### **"Database connection failed"**
- Check DATABASE_URL in .env
- Ensure database is running
- Verify network connectivity

### **"CORS error"**
- Check CORS_ORIGIN in backend .env
- Ensure frontend URL matches backend CORS settings

## 🔧 **Development Workflow**

### **Complete Setup Process:**
```bash
# 1. Install dependencies
npm install

# 2. Run setup
npm run setup

# 3. Run migrations
npm run migrate

# 4. Start development server
npm run dev

# 5. Test authentication
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!","name":"Test User","business_name":"Test Business"}'
```

### **Testing Authentication:**
```bash
# Register a user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!","name":"Test User","business_name":"Test Business"}'

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'

# Use the returned token for protected routes
curl -X GET http://localhost:3001/api/v1/business \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 📝 **Logs and Debugging**

### **Enable Debug Logging:**
```env
LOG_LEVEL=debug
```

### **Check Logs:**
```bash
# View real-time logs
tail -f logs/app.log

# Check for specific errors
grep "ERROR" logs/app.log
```

### **Prisma Debug:**
```bash
# Enable Prisma query logging
DEBUG=prisma:query npm run dev
```

## 🆘 **Still Having Issues?**

1. **Check the logs** for specific error messages
2. **Verify all environment variables** are set correctly
3. **Test database connection** manually
4. **Check Supabase dashboard** for authentication settings
5. **Try the auto-creation feature** by logging in again

If you're still experiencing issues, please provide:
- Error messages from logs
- Environment configuration (without sensitive data)
- Steps to reproduce the issue 