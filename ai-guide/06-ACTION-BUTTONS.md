# 06 - Action Buttons Library Generation

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

> ⚠️ **IMPORTANT:** Action buttons must be created BEFORE detail pages, because detail pages import and use these button components.

## Overview

The action buttons library provides **centralized, reusable button components** for all `@api` permissions and obligations in NPL protocols. Each button:
- **Checks backend actions** for visibility
- **Implements validation** from NPL `require()` statements
- **Uses consistent dialogs** for user input
- **Handles API calls** and loading states

## Understanding the @actions Field

When you fetch a protocol instance from the API, the response includes an `@actions` field that lists all actions the current user can perform:

```json
GET /npl/feedbacksystem/Issue/{id}

Response:
{
  "@id": "issue-123",
  "title": "Bug in login form",
  "description": "The login button doesn't work",
  "state": "submitted",
  "@actions": {
    "startTriage": {},
    "updatePriority": { "newPriority": "string" }
  }
}
```

### The @actions Field is the Source of Truth

The `@actions` field determines button visibility:

| If `@actions` contains... | Button behavior |
|---------------------------|-----------------|
| `"startTriage": {}` | Show "Start Triage" button |
| (missing `startTriage`) | Hide "Start Triage" button completely |
| `"updatePriority": {...}` | Show "Update Priority" button |

### Why the Backend Determines Actions

The NPL engine calculates `@actions` based on:
1. **Current protocol state** - Which transitions are valid from this state
2. **User's role/party membership** - Which parties the user belongs to
3. **Permission definitions** - The `permission[pParty] action() | state` syntax

**Never duplicate this logic in the frontend.** The backend already knows:
- What state the protocol is in
- Whether the user has the right role
- Whether all preconditions are met

### TypeScript Pattern

In your generated TypeScript types, `@actions` becomes `actions` (OpenAPI naming convention):

```typescript
interface Issue {
  '@id': string;
  title: string;
  state: string;
  // ... other fields
  actions?: IssueActions;  // The @actions field
}

interface IssueActions {
  startTriage?: object;
  updatePriority?: { newPriority: string };
  // ... one property per @api permission
}
```

### Button Component Pattern

Every action button follows this pattern:

```typescript
// Only render if action is available from backend
if (!actions?.startTriage) {
  return null;  // Hide button completely
}

return <Button onClick={handleStartTriage}>Start Triage</Button>;
```

## Structure

```
action-buttons/
├── ProtocolName/
│   ├── ActionNameButton.tsx    # One per @api action
│   ├── AnotherActionButton.tsx
│   └── index.ts
└── index.ts
```

## Generation Steps

### Step 1: Analyze NPL Permissions

For each `@api` permission/obligation in the protocol:

```npl
@api
permission[pBank] configureDog() | created {
    require(dogName.length() > 0, "Dog name must be set");
    require(ownerEmail.contains("@"), "Valid owner email required");
    become configured;
};

@api
permission[pBank] updateProgress(progress: Number) | configured {
    require(progress >= 0 && progress <= 100, "Progress must be between 0 and 100");
    overallProgress = progress;
};
```

### Step 2: Generate Button Component

Create `src/components/action-buttons/ProtocolName/ConfigureDogButton.tsx`:

```typescript
import React, { useState } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { useServices } from '../../../ServiceProvider';
import type { ProtocolName, ProtocolNameActions } from '../../../generated/models';
import type { ActionButtonProps } from '../types';

interface ConfigureDogButtonProps extends ActionButtonProps<ProtocolName, ProtocolNameActions> {}

export const ConfigureDogButton: React.FC<ConfigureDogButtonProps> = ({
  protocol,
  actions,
  onActionComplete,
  disabled = false,
}) => {
  const services = useServices();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Button visibility: only show if action is available in backend
  if (!actions.configureDog) {
    return null;
  }

  // Validation logic matching require statements from NPL:
  // require(dogName.length() > 0, "...")
  // require(ownerEmail.contains("@"), "...")
  const canConfigure = () => {
    const hasDogName = protocol?.dogName && protocol.dogName.length > 0;
    const hasValidEmail = protocol?.ownerEmail && protocol.ownerEmail.includes('@');
    return hasDogName && hasValidEmail;
  };

  const handleSubmit = async () => {
    if (!protocol || !services?.api) return;

    try {
      setLoading(true);
      await services.api.protocolNameConfigureDog({ id: protocol.id });
      setDialogOpen(false);
      onActionComplete(); // Refresh protocol data
    } catch (error) {
      console.error('Failed to configure dog:', error);
      // Handle error (show toast, etc.)
    } finally {
      setLoading(false);
    }
  };

  const validationMessage = !canConfigure() 
    ? (!protocol?.dogName || protocol.dogName.length === 0
        ? "Dog name must be set"
        : "Valid owner email required")
    : "";

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        startIcon={<CheckCircle />}
        onClick={() => setDialogOpen(true)}
        disabled={disabled || loading || !canConfigure()}
        title={validationMessage}
      >
        Configure Dog
      </Button>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configure Dog</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Current state: <strong>{protocol?.state}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will transition the dog training protocol to the configured state.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleSubmit}
            disabled={loading || !canConfigure()}
            startIcon={<CheckCircle />}
          >
            Configure Dog
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
```

### Step 3: Generate Button with Parameters

For actions that require user input:

Create `src/components/action-buttons/ProtocolName/UpdateProgressButton.tsx`:

```typescript
import React, { useState } from 'react';
import { 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField,
  Typography 
} from '@mui/material';
import { TrendingUp } from '@mui/icons-material';
import { useServices } from '../../../ServiceProvider';
import type { ProtocolName, ProtocolNameActions } from '../../../generated/models';
import type { ActionButtonProps } from '../types';

interface UpdateProgressButtonProps extends ActionButtonProps<ProtocolName, ProtocolNameActions> {}

export const UpdateProgressButton: React.FC<UpdateProgressButtonProps> = ({
  protocol,
  actions,
  onActionComplete,
  disabled = false,
}) => {
  const services = useServices();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number>(protocol?.overallProgress || 0);

  // Button visibility: only show if action is available in backend
  if (!actions.updateProgress) {
    return null;
  }

  // Validation logic matching require statement from NPL:
  // require(progress >= 0 && progress <= 100, "...")
  const isValidProgress = (value: number) => {
    return value >= 0 && value <= 100;
  };

  const handleSubmit = async () => {
    if (!protocol || !services?.api || !isValidProgress(progress)) return;

    try {
      setLoading(true);
      await services.api.protocolNameUpdateProgress({
        id: protocol.id,
        protocolNameUpdateProgressCommand: {
          progress: progress
        }
      });
      setDialogOpen(false);
      setProgress(protocol.overallProgress || 0);
      onActionComplete(); // Refresh protocol data
    } catch (error) {
      console.error('Failed to update progress:', error);
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        color="primary"
        startIcon={<TrendingUp />}
        onClick={() => setDialogOpen(true)}
        disabled={disabled || loading}
      >
        Update Progress
      </Button>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Training Progress</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Progress (%)"
            type="number"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            inputProps={{ min: 0, max: 100, step: 1 }}
            error={!isValidProgress(progress)}
            helperText={!isValidProgress(progress) ? "Progress must be between 0 and 100" : ""}
            sx={{ mt: 2 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Current progress: {protocol?.overallProgress || 0}%
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !isValidProgress(progress)}
          >
            Update Progress
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
```

## ActionButtonProps Interface

Create `src/components/action-buttons/types.ts`:

```typescript
export interface ActionButtonProps<TProtocol, TActions> {
  protocol: TProtocol;
  actions: TActions;
  onActionComplete: () => void;
  disabled?: boolean;
}
```

## Index Files

Create `src/components/action-buttons/ProtocolName/index.ts`:

```typescript
export { ConfigureDogButton } from './ConfigureDogButton';
export { UpdateProgressButton } from './UpdateProgressButton';
// Export all buttons for this protocol
```

Create `src/components/action-buttons/index.ts`:

```typescript
export * from './ProtocolName';
// Export all protocol button libraries
```

## Validation Pattern

For each `require()` statement in NPL, create a validation check:

```npl
// NPL
require(underlyings.allMatch(u -> u.initialLevel.isPresent()), "...");
require(couponDates.anyMatch(c -> !c.paid), "...");
```

```typescript
// TypeScript
const canExecuteAction = () => {
  const hasInitialLevels = protocol?.underlyings?.every(
    u => u.initialLevel != null && u.initialLevel > 0
  ) || false;
  
  const hasUnpaidCoupons = protocol?.couponDates?.some(c => !c.paid) || false;
  
  return hasInitialLevels && hasUnpaidCoupons;
};
```

## Dialog Patterns

### Confirmation Dialog (No Parameters)

```typescript
<Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
  <DialogTitle>Action Title</DialogTitle>
  <DialogContent>
    <Typography>Are you sure you want to perform this action?</Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
    <Button variant="contained" onClick={handleSubmit}>Confirm</Button>
  </DialogActions>
</Dialog>
```

### Form Dialog (With Parameters)

```typescript
<Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
  <DialogTitle>Action Title</DialogTitle>
  <DialogContent>
    <TextField
      fullWidth
      label="Parameter Name"
      value={parameterValue}
      onChange={(e) => setParameterValue(e.target.value)}
      required
      sx={{ mt: 2 }}
    />
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
    <Button 
      variant="contained" 
      onClick={handleSubmit}
      disabled={!isValid()}
    >
      Submit
    </Button>
  </DialogActions>
</Dialog>
```

## Usage in Detail Pages

Import and use in detail pages:

```typescript
import { ConfigureDogButton, UpdateProgressButton } from '../action-buttons/ProtocolName';

const getActionButtons = () => {
  if (!protocol) return null;
  
  const hasActions = protocol.actions || {};
  
  return (
    <>
      <ConfigureDogButton
        protocol={protocol}
        actions={hasActions}
        onActionComplete={handleActionComplete}
        disabled={loading}
      />
      <UpdateProgressButton
        protocol={protocol}
        actions={hasActions}
        onActionComplete={handleActionComplete}
        disabled={loading}
      />
    </>
  );
};
```

## Button Visibility Rules

1. **Always check `actions.actionName`** - Only show if backend allows
2. **Never check `protocol.state`** - Backend already validates
3. **Never check user roles** - Backend already validates
4. **Only validate `require()` statements** - For UX purposes

## Real-World Example: Wine Cellar Application

The Wine Cellar application demonstrates the complete action buttons pattern:

### Structure Created

```
frontend/src/components/action-buttons/
├── types.ts                      # ActionButtonProps<TProtocol, TActions>
├── index.ts                      # Re-exports all buttons
├── Wine/
│   ├── UpdateTastingNotesButton.tsx
│   ├── UpdateFoodPairingsButton.tsx
│   ├── UpdateDrinkingWindowButton.tsx
│   ├── UpdateServingRecommendationsButton.tsx
│   ├── UpdateExternalReferenceButton.tsx
│   ├── ArchiveButton.tsx
│   └── index.ts
├── Bottle/
│   ├── UpdatePurchasePriceButton.tsx
│   ├── UpdateStorageLocationButton.tsx
│   ├── AddNotesButton.tsx
│   ├── OpenBottleButton.tsx
│   ├── StartCoravinButton.tsx
│   ├── AddCoravinPourButton.tsx
│   ├── FinishCoravinBottleButton.tsx
│   ├── FinishBottleButton.tsx
│   ├── MarkSpoiledButton.tsx
│   ├── MarkBrokenButton.tsx
│   └── index.ts
└── ConsumptionPolicy/
    ├── UpdateMinimumValueButton.tsx
    ├── UpdateMaxBottlesPerMonthButton.tsx
    ├── SetOwnerPresenceRequiredButton.tsx
    ├── ChangeConsumptionTypeButton.tsx
    ├── ArchiveButton.tsx
    └── index.ts
```

### Example: UpdateDrinkingWindowButton

This button demonstrates validation from NPL `require()` statements:

**NPL Protocol:**
```npl
@api
permission[pOwner | pCellarManager] updateDrinkingWindow(
    windowStart: Number,
    windowEnd: Number
) | active {
    require(windowStart <= windowEnd, "Start year must be before or equal to end year");
    require(windowStart >= vintage, "Start year cannot be before vintage");
    drinkingWindowStart = windowStart;
    drinkingWindowEnd = windowEnd;
};
```

**TypeScript Button Component:**
```typescript
export const UpdateDrinkingWindowButton: React.FC<UpdateDrinkingWindowButtonProps> = ({
  protocol,
  actions,
  onActionComplete,
  disabled = false,
}) => {
  const [windowStart, setWindowStart] = useState<number>(protocol.vintage);
  const [windowEnd, setWindowEnd] = useState<number>(protocol.vintage + 10);

  // Only show if action is available
  if (!actions.updateDrinkingWindow) {
    return null;
  }

  // Validation from NPL: windowStart <= windowEnd && windowStart >= vintage
  const isValid = windowStart <= windowEnd && windowStart >= protocol.vintage;

  const handleSubmit = async () => {
    if (!isValid) return;
    await api.wineUpdateDrinkingWindow({
      id: protocol['@id'],
      requestBody: { windowStart, windowEnd },
    });
    onActionComplete();
  };

  // ... dialog implementation with validation feedback
};
```

### Usage in Detail Pages

All detail pages follow this pattern:

```typescript
import {
  UpdateTastingNotesButton,
  UpdateFoodPairingsButton,
  // ... other buttons
} from '../action-buttons/Wine';

export const WineDetailPage: React.FC = () => {
  const [wine, setWine] = useState<Wine | null>(null);
  
  const fetchWine = async () => {
    const response = await api.getWineById({ id });
    setWine(response);
  };

  return (
    <Box>
      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <UpdateTastingNotesButton
          protocol={wine}
          actions={wine['@actions']}
          onActionComplete={fetchWine}
        />
        <UpdateFoodPairingsButton
          protocol={wine}
          actions={wine['@actions']}
          onActionComplete={fetchWine}
        />
        {/* ... other buttons */}
      </Box>
      {/* ... rest of page */}
    </Box>
  );
};
```

### Key Implementation Details

1. **Visibility**: Each button checks `actions.actionName` and returns `null` if not available
2. **Validation**: Client-side validation mirrors NPL `require()` statements for better UX
3. **API Calls**: Uses generated API client methods (e.g., `api.wineUpdateDrinkingWindow`)
4. **Refresh**: `onActionComplete` callback refreshes the protocol data after successful actions
5. **Loading States**: Buttons are disabled during API calls
6. **Error Handling**: Console logging for debugging (can be extended with toast notifications)

## Next Steps

Once action buttons are generated, proceed to:
- [10-CODE-TEMPLATES.md](./10-CODE-TEMPLATES.md) - Complete code templates

