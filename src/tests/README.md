# TenantFlow Backend Test Suite

This directory contains comprehensive integration tests for the TenantFlow CRM backend API.

## Test Structure

```
src/tests/
├── integration/           # Integration tests for all endpoints
│   ├── auth.test.ts      # Authentication endpoints
│   ├── business.test.ts  # Business management
│   ├── clients.test.ts   # Client CRUD operations
│   ├── leads.test.ts     # Lead management
│   ├── followups.test.ts # Follow-up management
│   ├── users.test.ts     # User management
│   ├── analytics.test.ts # Analytics endpoints
│   ├── health.test.ts    # Health check and 404 handling
│   ├── rate-limiting.test.ts # Rate limiting tests
│   ├── cors.test.ts      # CORS configuration tests
│   └── complete-workflow.test.ts # End-to-end workflow
├── utils/
│   └── testHelpers.ts    # Test utility functions
├── setup.ts              # Test setup and database cleanup
└── README.md            # This file
```

## Running Tests

### All Tests
```bash
npm test
```

### Integration Tests Only
```bash
npm run test:integration
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Specific Test File
```bash
npm test -- auth.test.ts
```

## Test Coverage

The test suite covers:

### Authentication & Authorization
- ✅ User registration with validation
- ✅ User login/logout
- ✅ Password reset functionality
- ✅ JWT token validation
- ✅ Role-based access control
- ✅ Business isolation

### Business Management
- ✅ Business creation and retrieval
- ✅ Business updates (admin only)
- ✅ Business access control

### Client Management
- ✅ Create, read, update, delete clients
- ✅ Client limit enforcement (free tier)
- ✅ Business-scoped client access

### Lead Management
- ✅ Lead creation and status management
- ✅ Lead filtering and search
- ✅ Lead-client relationships

### Follow-up Management
- ✅ Follow-up scheduling and completion
- ✅ Due date management
- ✅ Client-follow-up relationships

### User Management
- ✅ Staff user creation (admin only)
- ✅ User role management
- ✅ User CRUD operations

### Analytics
- ✅ Dashboard metrics
- ✅ Sales pipeline analytics
- ✅ Lead conversion tracking
- ✅ AI predictions (when configured)

### System Features
- ✅ Health check endpoint
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Error handling
- ✅ 404 handling

### Complete Workflows
- ✅ End-to-end CRM workflow
- ✅ Multi-user scenarios
- ✅ Permission testing

## Test Data Management

Tests use a clean database state for each test:
- Database is cleaned before each test
- Test data is isolated per test
- No test pollution between runs

## Environment Setup

Tests require:
- PostgreSQL database (test environment)
- Supabase configuration
- Environment variables set up

## Test Utilities

The `testHelpers.ts` file provides:
- User creation and authentication helpers
- Test data generators
- Common test operations
- Async condition waiting

## Best Practices

1. **Isolation**: Each test is independent
2. **Cleanup**: Database is cleaned between tests
3. **Authentication**: Proper token handling
4. **Error Testing**: Both success and failure cases
5. **Edge Cases**: Boundary conditions and validation
6. **Performance**: Reasonable timeouts for async operations

## Debugging Tests

To debug failing tests:

1. Run specific test file:
   ```bash
   npm test -- --testNamePattern="specific test name"
   ```

2. Enable verbose output:
   ```bash
   npm test -- --verbose
   ```

3. Check test logs and error messages
4. Verify database state if needed
5. Use test helpers for consistent setup

## Adding New Tests

When adding new endpoints or features:

1. Create test file in appropriate directory
2. Follow existing test patterns
3. Include both positive and negative test cases
4. Test authentication and authorization
5. Test data validation
6. Update this README if needed

## CI/CD Integration

Tests are designed to run in CI/CD environments:
- No external dependencies (except configured services)
- Deterministic results
- Proper cleanup
- Clear error reporting