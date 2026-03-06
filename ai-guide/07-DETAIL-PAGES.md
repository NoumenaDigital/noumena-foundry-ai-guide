# 07 - Detail Pages Generation

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

Each protocol gets a **detail page** that displays:
- **Page header** with breadcrumbs, title, state, and action buttons
- **Organized sections** based on NPL inline comments
- **Action buttons** from the centralized library
- **Real-time updates** via SSE

## Structure

```
ProtocolNameDetailPage.tsx
├── PageHeader
│   ├── Breadcrumbs
│   ├── Title & State
│   └── Action Buttons
├── Section 1 (from NPL comments)
│   ├── Field 1
│   ├── Field 2
│   └── ...
├── Section 2 (from NPL comments)
│   └── ...
└── ...
```

## Generation Steps

### Step 1: Analyze NPL Protocol

From the NPL protocol file:
1. **Extract variables** with `@frontend` comments
2. **Group by section** (same section name = same UI section)
3. **Identify component types** (text, table, chip, etc.)
4. **Extract `@api` permissions** for action buttons

### Step 2: Generate Detail Component

Create `src/components/detail-pages/ProtocolNameDetailPage.tsx`:

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Breadcrumbs,
  Link,
  useTheme,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useServices } from '../../ServiceProvider';
import { useAuth } from '../../hooks/useAuth';
import { useProtocolSSE } from '../../hooks/useProtocolSSE';
import { ProtocolUpdateEvent } from '../../services/SSEService';
import { PageHeader, PageNotFound } from '../shared';
import { isAuthError, isNotFoundError } from '../../utils/errorUtils';
import { ProtocolName, ProtocolNameActions } from '../../generated/models';
// Import action buttons
import { Action1Button, Action2Button } from '../action-buttons/ProtocolName';

export const ProtocolNameDetailPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const services = useServices();
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<ProtocolName | null>(null);

  useEffect(() => {
    if (id) {
      fetchProtocol(id);
    }
  }, [id]);

  const fetchProtocol = async (protocolId: string, silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      
      if (!services?.api) {
        throw new Error('Services not available');
      }

      const response = await services.api.getProtocolNameByID({ id: protocolId });
      
      if (response) {
        setProtocol(response);
      } else {
        throw new Error('Protocol not found');
      }
    } catch (e: unknown) {
      if (isAuthError(e)) {
        navigate('/', { replace: true });
        return;
      }
      if (isNotFoundError(e)) {
        if (!silent) {
          setError('not-found');
        }
        return;
      }
      if (!silent) {
        setError('Failed to load protocol data.');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Action completion handler
  const handleActionComplete = async () => {
    if (protocol?.id) {
      await fetchProtocol(protocol.id);
    }
  };

  // SSE callback for real-time updates
  const handleProtocolUpdate = useCallback(async (event: ProtocolUpdateEvent) => {
    if (id && event.protocolId === id) {
      try {
        await fetchProtocol(id, true); // Silent refresh
      } catch (error) {
        console.error('Failed to refresh protocol after SSE update:', error);
      }
    }
  }, [id]);

  // SSE connection
  const { isConnected, lastUpdate } = useProtocolSSE(
    ['ProtocolName'], 
    handleProtocolUpdate, 
    undefined, 
    id
  );

  const getActionButtons = () => {
    if (!protocol) return null;

    // Get actions from backend
    const hasActions = protocol.actions || {} as ProtocolNameActions;

    return (
      <>
        <Action1Button
          protocol={protocol}
          actions={hasActions}
          onActionComplete={handleActionComplete}
          disabled={loading}
        />
        <Action2Button
          protocol={protocol}
          actions={hasActions}
          onActionComplete={handleActionComplete}
          disabled={loading}
        />
        {/* Add more action buttons as needed */}
      </>
    );
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'created': return 'warning';
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

  if (error === 'not-found' || (!protocol && !loading && !error)) {
    return <PageNotFound message="The protocol you are looking for could not be found." />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ margin: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!protocol) {
    return null;
  }

  return (
    <Box>
      <PageHeader
        variant="detail"
        breadcrumbs={
          <Breadcrumbs>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/protocol-name-overview')}
              sx={{ textDecoration: 'none', cursor: 'pointer' }}
            >
              Protocol Name Overview
            </Link>
            <Typography color="text.primary" variant="body2">
              {protocol.name}
            </Typography>
          </Breadcrumbs>
        }
        backLabel="Back to Overview"
        onBack={() => navigate('/protocol-name-overview')}
        title={protocol.name}
        state={protocol.state}
        stateColor={getStateColor(protocol.state) as any}
        isConnected={isConnected}
        lastUpdate={lastUpdate}
        primaryAction={getActionButtons()}
      />

      {/* Protocol Info Chips */}
      <Box display="flex" gap={1} alignItems="center" sx={{ mb: 3 }}>
        <Chip label={protocol.id} variant="outlined" size="small" />
        {/* Add other info chips */}
      </Box>

      {/* Section 1: Basic Information (from NPL comments) */}
      <Card sx={{ marginBottom: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ marginBottom: 2 }}>
            Basic Information
          </Typography>
          <Divider sx={{ marginBottom: 2 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Name
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {protocol.name}
              </Typography>
            </Grid>
            {/* Add other fields from this section */}
          </Grid>
        </CardContent>
      </Card>

      {/* Section 2: Additional Information (from NPL comments) */}
      {/* Generate sections based on NPL @frontend comments */}
    </Box>
  );
};
```

## Section Generation from NPL Comments

### Example NPL Protocol:

```npl
protocol[bank] DogTraining(
    // @frontend: Display in "Basic Information" section
    // @frontend: Label: "Dog Name"
    var dogName: Text,
    
    // @frontend: Display in "Basic Information" section
    // @frontend: Label: "Owner Name"
    var ownerName: Text,
    
    // @frontend: Display in "Training Progress" section as table
    // @frontend: Table columns: Command, Status, Date Learned
    var learnedCommands: List<Command>,
    
    // @frontend: Display in "Training Progress" section as KPI card
    // @frontend: Format: Large number with percentage
    // @frontend: Label: "Overall Progress"
    var overallProgress: Number
) {
    // ...
}
```

### Generated Sections:

```typescript
{/* Basic Information Section */}
<Card sx={{ marginBottom: 3 }}>
  <CardContent>
    <Typography variant="h6" sx={{ marginBottom: 2 }}>
      Basic Information
    </Typography>
    <Divider sx={{ marginBottom: 2 }} />
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Typography variant="body2" color="text.secondary">
          Dog Name
        </Typography>
        <Typography variant="body1" fontWeight={600}>
          {protocol.dogName}
        </Typography>
      </Grid>
      <Grid item xs={12} md={6}>
        <Typography variant="body2" color="text.secondary">
          Owner Name
        </Typography>
        <Typography variant="body1" fontWeight={600}>
          {protocol.ownerName}
        </Typography>
      </Grid>
    </Grid>
  </CardContent>
</Card>

{/* Training Progress Section */}
<Card sx={{ marginBottom: 3 }}>
  <CardContent>
    <Typography variant="h6" sx={{ marginBottom: 2 }}>
      Training Progress
    </Typography>
    <Divider sx={{ marginBottom: 2 }} />
    
    {/* KPI Card */}
    <Grid container spacing={3} sx={{ marginBottom: 3 }}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Overall Progress
            </Typography>
            <Typography variant="h3" color="primary">
              {protocol.overallProgress}%
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
    
    {/* Table */}
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Command</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Date Learned</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {protocol.learnedCommands?.map((cmd, index) => (
            <TableRow key={index}>
              <TableCell>{cmd.command}</TableCell>
              <TableCell>
                <Chip label={cmd.status} color={getStatusColor(cmd.status)} />
              </TableCell>
              <TableCell>{formatDate(cmd.dateLearned)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </CardContent>
</Card>
```

## Component Type Mapping

Based on `@frontend` comments:

| Comment | Component | Example |
|---------|-----------|---------|
| `Format: text` | `Typography` | Plain text display |
| `Format: table` | `Table` | List/Set data |
| `Format: chip` | `Chip` | Status indicators |
| `Format: date picker` | `Typography` (read-only) | Date display |
| `Format: currency` | `Typography` with formatting | Currency amounts |
| `Format: percentage` | `Typography` with % | Percentages |
| `Format: KPI card` | `Card` with large number | Metrics |

## Action Buttons Integration

Import and use action buttons from the library:

```typescript
import { 
  Action1Button, 
  Action2Button 
} from '../action-buttons/ProtocolName';

const getActionButtons = () => {
  if (!protocol) return null;
  
  const hasActions = protocol.actions || {};
  
  return (
    <>
      {hasActions.action1 && (
        <Action1Button
          protocol={protocol}
          actions={hasActions}
          onActionComplete={handleActionComplete}
          disabled={loading}
        />
      )}
      {/* More buttons... */}
    </>
  );
};
```

## Route Configuration

Add route in `Router.tsx`:

```typescript
{
  path: '/protocol-name-detail/:id',
  element: <ProtectedRoute>{withSuspense(ProtocolNameDetailPage)}</ProtectedRoute>
}
```

## Next Steps

Once detail pages are generated, proceed to:
- [08-CREATION-FORMS.md](./08-CREATION-FORMS.md) - Generate creation forms

