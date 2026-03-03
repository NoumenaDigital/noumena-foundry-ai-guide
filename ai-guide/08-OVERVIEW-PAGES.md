# 08 - Overview Pages Generation

## ⚠️ PREREQUISITE: API Client Must Exist

**This guide is for PHASE 3 of the development workflow.**

Before starting this guide, verify the API client has been generated:

```bash
# Verify generated files exist
ls frontend/src/generated/
# ✅ Should see: index.ts, models/, services/, core/

# If missing, generate it: make generate-api (see 04-FRONTEND-SETUP.md)
```

**❌ DO NOT proceed if `src/generated/` does not exist.**

---

## Overview

Each protocol gets an **overview page** that displays all instances in a table format. The page includes:
- **Page header** with title and "Create New" button
- **Search and filter** functionality
- **Data table** with clickable rows
- **Real-time updates** via SSE (Server-Sent Events)

## Structure

```
ProtocolNameOverview.tsx
├── PageHeader (with Create button)
├── Search/Filter Bar
└── DataTable
    ├── Table Headers
    └── Table Rows (clickable → navigate to detail page)
```

## Generation Steps

### Step 1: Analyze Protocol Structure

From the NPL protocol and generated API, identify:
1. **List endpoint**: `getProtocolNameList()`
2. **Protocol fields** to display in table
3. **State field** for status display
4. **Key identifier** (usually `id` or `name`)

### Step 2: Generate Overview Component

Create `src/components/overview-pages/ProtocolNameOverview.tsx`:

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Search, Add } from '@mui/icons-material';
import { useServices } from '../../ServiceProvider';
import { useAuth } from '../../hooks/useAuth';
import { useProtocolSSE } from '../../hooks/useProtocolSSE';
import { ProtocolUpdateEvent } from '../../services/SSEService';
import { PageHeader } from '../shared/PageHeader';
import { ProtocolName, ProtocolNameList } from '../../generated/models';

interface ProtocolDisplay {
  id: string;
  // Add fields based on protocol structure
  name: string;
  state: string;
  // ... other display fields
}

export const ProtocolNameOverview: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const services = useServices();
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [protocols, setProtocols] = useState<ProtocolDisplay[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProtocols();
  }, []);

  const fetchProtocols = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!services?.api) {
        throw new Error('Services not available');
      }

      const response = await services.api.getProtocolNameList({
        page: 1,
        pageSize: 100,
        includeCount: true
      });

      // Transform API response to display format
      const transformed: ProtocolDisplay[] = response.items.map((protocol: ProtocolName) => ({
        id: protocol.id,
        name: protocol.name,
        state: protocol.state,
        // Map other fields...
      }));

      setProtocols(transformed);
    } catch (e) {
      console.error('Failed to fetch protocols:', e);
      setError('Failed to load protocols. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // SSE callback for real-time updates
  const handleProtocolUpdate = useCallback(async (event: ProtocolUpdateEvent) => {
    if (!services?.api) return;

    try {
      // Fetch the updated protocol
      const protocolRes = await services.api.getProtocolNameByID({ id: event.protocolId });
      
      if (protocolRes) {
        const transformed: ProtocolDisplay = {
          id: protocolRes.id,
          name: protocolRes.name,
          state: protocolRes.state,
          // Map other fields...
        };
        
        setProtocols(prev => {
          const existingIndex = prev.findIndex(p => p.id === event.protocolId);
          
          if (existingIndex >= 0) {
            // Update existing
            const updated = [...prev];
            updated[existingIndex] = transformed;
            return updated;
          } else {
            // Add new (creation event)
            return [...prev, transformed];
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch updated protocol:', error);
    }
  }, [services?.api]);

  // SSE connection
  const { isConnected, lastUpdate } = useProtocolSSE(['ProtocolName'], handleProtocolUpdate);

  const filteredProtocols = protocols.filter(protocol =>
    protocol.name.toLowerCase().includes(searchTerm.toLowerCase())
    // Add other searchable fields...
  );

  const getStatusColor = (state: string) => {
    // Map states to colors
    switch (state) {
      case 'created': return 'default';
      case 'active': return 'success';
      case 'completed': return 'info';
      case 'closed': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ margin: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <PageHeader
        variant="overview"
        title="Protocol Name Overview"
        subtitle="Manage and monitor all protocol instances"
        isConnected={isConnected}
        lastUpdate={lastUpdate}
        primaryAction={
          hasRole('admin') ? ( // Adjust role as needed
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/protocol-name-create')}
            >
              Create New Protocol
            </Button>
          ) : undefined
        }
      />

      {/* Search and Filters */}
      <Card sx={{ marginBottom: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} alignItems="center">
            <TextField
              placeholder="Search protocols..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ flexGrow: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {filteredProtocols.length} of {protocols.length} protocols
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Protocols Table */}
      <Card>
        <CardContent>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : theme.palette.grey[50] 
                }}>
                  <TableCell>Name</TableCell>
                  <TableCell>State</TableCell>
                  {/* Add other column headers based on protocol fields */}
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProtocols.map((protocol) => (
                  <TableRow 
                    key={protocol.id} 
                    hover
                    onClick={() => navigate(`/protocol-name-detail/${protocol.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography variant="body1" fontWeight={600}>
                        {protocol.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={protocol.state.charAt(0).toUpperCase() + protocol.state.slice(1)} 
                        color={getStatusColor(protocol.state) as any}
                        size="small" 
                      />
                    </TableCell>
                    {/* Add other table cells */}
                    <TableCell align="right">
                      {/* Optional: Quick actions */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};
```

## Key Features

### 1. Page Header
- **Title**: Protocol name (plural)
- **Subtitle**: Description of what the overview shows
- **Create Button**: Only shown if user has required role
- **Live Updates Indicator**: Shows SSE connection status

### 2. Search Functionality
- Search across key fields (name, ID, etc.)
- Real-time filtering as user types
- Result count display

### 3. Data Table
- **Clickable rows**: Navigate to detail page on click
- **State chips**: Color-coded status indicators
- **Responsive**: Works on mobile and desktop
- **Sortable**: Optional sorting by columns

### 4. Real-Time Updates
- **SSE connection**: Listens for protocol updates
- **Auto-refresh**: Updates table when protocols change
- **Connection indicator**: Shows live update status

## Table Column Selection

Choose columns based on:
1. **Most important fields** from protocol
2. **User needs** for quick identification
3. **State/status** (always include)
4. **Key identifiers** (name, ID, etc.)

**Common columns:**
- Name/Title
- State/Status
- Created Date
- Last Updated
- Key metrics (if applicable)

## Role-Based Visibility

The "Create New" button should check user roles:

```typescript
primaryAction={
  hasRole('admin') || hasRole('manager') ? (
    <Button onClick={() => navigate('/protocol-name-create')}>
      Create New Protocol
    </Button>
  ) : undefined
}
```

## Empty State

Handle empty state when no protocols exist:

```typescript
{filteredProtocols.length === 0 && (
  <Card>
    <CardContent>
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No protocols found
        </Typography>
        {hasRole('admin') && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/protocol-name-create')}
            sx={{ mt: 2 }}
          >
            Create First Protocol
          </Button>
        )}
      </Box>
    </CardContent>
  </Card>
)}
```

## Route Configuration

Add route in `Router.tsx`:

```typescript
{
  path: '/protocol-name-overview',
  element: <ProtectedRoute>{withSuspense(ProtocolNameOverview)}</ProtectedRoute>
}
```

## Internationalization

Add translation keys:

```json
{
  "protocolName": {
    "overview": {
      "title": "Protocol Name Overview",
      "subtitle": "Manage and monitor all protocol instances",
      "createButton": "Create New Protocol",
      "searchPlaceholder": "Search protocols...",
      "noResults": "No protocols found"
    }
  }
}
```

## Next Steps

Once overview pages are generated, proceed to:
- [07-DETAIL-PAGES.md](./07-DETAIL-PAGES.md) - Generate detail pages

