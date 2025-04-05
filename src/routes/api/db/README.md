# Database Integration with Neon Serverless

This directory contains the integration with Neon PostgreSQL serverless database for the Unsigned Frontend project.

## Overview

The integration uses `@neondatabase/serverless` to connect to a Neon PostgreSQL database from SvelteKit server routes. This provides persistent storage for compositions and other application data.

## Endpoints

### `/api/db`
- `GET`: Returns the PostgreSQL version to verify connection

### `/api/db/schema`
- `POST`: Creates the necessary database tables if they don't exist

### `/api/db/tables`
- `GET`: Returns a list of all tables in the database with their column counts

### `/api/db/compositions`
- `GET`: Retrieves all compositions or a specific one by transaction ID
- `POST`: Creates a new composition with specified unsig positions

## Database Schema

### `compositions` Table
- `id`: Serial primary key
- `transaction_id`: Unique identifier for the composition transaction
- `positions`: JSONB data containing unsig indices and their grid positions
- `created_at`: Timestamp when the record was created

## Position JSON Structure

Each position in the `positions` column is stored as a JSON array of objects with the following structure:

```json
[
  {
    "unsigIndex": 1,
    "row": 0,
    "column": 0
  },
  {
    "unsigIndex": 2,
    "row": 0,
    "column": 1
  }
]
```

## Usage

### Creating Schema
```typescript
// Initialize database schema
fetch('/api/db/schema', { method: 'POST' });
```

### Storing a Composition
```typescript
const compositionData = {
  transactionId: '123abc...',
  positions: [
    { unsigIndex: 1, row: 0, column: 0 },
    { unsigIndex: 2, row: 0, column: 1 },
    { unsigIndex: 3, row: 1, column: 0 }
  ]
};

const response = await fetch('/api/db/compositions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(compositionData)
});
```

### Retrieving Compositions
```typescript
// Get all compositions
const allResponse = await fetch('/api/db/compositions');
const { compositions } = await allResponse.json();

// Get specific composition by transaction ID
const specificResponse = await fetch(`/api/db/compositions?transactionId=123abc...`);
const { composition } = await specificResponse.json();
```

## Testing

The `/api/db/compositions/+page.svelte` page provides a UI for testing the database integration with forms for creating and viewing compositions.

## Environment Variables

The database connection uses the `DATABASE_URL` environment variable, which should be set in the `.env` file:

```
DATABASE_URL="postgres://username:password@hostname/database?sslmode=require"
``` 