# 09 - Creation Forms Generation

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

Each protocol gets a **creation form** that allows users to create new protocol instances. The form is generated from:
- **Protocol parameters** (from NPL protocol declaration)
- **NPL `require()` statements** (for validation)
- **Field types** (for appropriate input components)

## Structure

```
ProtocolNameCreationForm.tsx
├── PageHeader (with back button)
├── Form Sections (grouped logically)
│   ├── Basic Information
│   ├── Additional Details
│   └── ...
└── Submit Button
```

## Generation Steps

### Step 1: Analyze Protocol Parameters

From the NPL protocol declaration:

```npl
protocol[pBank, pClient] DogTraining(
    var dogName: Text,              // Required text field
    var ownerName: Text,            // Required text field
    var ownerEmail: Text,           // Required email field
    var ageCategory: Text,          // Dropdown: "Puppy", "Adult", "Senior"
    var nextTrainingDate: LocalDate, // Date picker
    var initialCommands: List<Command> // Optional list
) {
    require(dogName.length() > 0, "Dog name is required");
    require(ownerEmail.contains("@"), "Valid email is required");
    // ...
}
```

### Step 2: Generate Form Component

Create `src/components/creation-forms/ProtocolNameCreationForm.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  Autocomplete,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useServices } from '../../ServiceProvider';
import { ArrowBack, Save } from '@mui/icons-material';
import { PageHeader, ClickableSectionHeader } from '../shared';
import { ProtocolNameCreateCommand } from '../../generated/models';

interface FormData {
  dogName: string;
  ownerName: string;
  ownerEmail: string;
  ageCategory: string;
  nextTrainingDate: string;
  // Add other fields...
}

const AGE_CATEGORIES = [
  { value: 'Puppy', label: 'Puppy' },
  { value: 'Adult', label: 'Adult' },
  { value: 'Senior', label: 'Senior' },
];

export const ProtocolNameCreationForm: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const services = useServices();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    dogName: '',
    ownerName: '',
    ownerEmail: '',
    ageCategory: '',
    nextTrainingDate: '',
  });

  const handleInputChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      if (!services?.api) {
        throw new Error('Services not available');
      }

      // Validate form data (based on NPL require statements)
      if (!formData.dogName.trim()) {
        throw new Error('Dog name is required');
      }
      if (!formData.ownerEmail.includes('@')) {
        throw new Error('Valid email is required');
      }

      // Build command object
      const command: ProtocolNameCreateCommand = {
        '@parties': {}, // Will be populated by backend
        dogName: formData.dogName,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail,
        ageCategory: formData.ageCategory,
        nextTrainingDate: formData.nextTrainingDate ? new Date(formData.nextTrainingDate).toISOString() : undefined,
        // Add other fields...
      };
      
      // Call API to create protocol instance
      const result = await services.api.createProtocolName({
        protocolNameCreateCommand: command
      });
      
      console.log('Protocol created successfully:', result);
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/protocol-name-overview');
      }, 2000);
    } catch (e) {
      console.error('Failed to create protocol:', e);
      setError(e instanceof Error ? e.message : 'Failed to create protocol. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    // Validate based on NPL require statements
    return formData.dogName.trim() !== '' &&
           formData.ownerName.trim() !== '' &&
           formData.ownerEmail.includes('@') &&
           formData.ageCategory !== '';
  };

  if (success) {
    return (
      <Box>
        <Alert severity="success" sx={{ marginBottom: 3 }}>
          Protocol created successfully! Redirecting to overview...
        </Alert>
        <Box display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        variant="form"
        backLabel="Back to Overview"
        onBack={() => navigate('/protocol-name-overview')}
        title="Create New Protocol"
        subtitle="Fill in the form below to create a new protocol instance"
      />

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Basic Information Section */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <ClickableSectionHeader
                  title="Basic Information"
                  onClick={() => {}}
                  disabled={loading}
                />
                <Divider sx={{ marginBottom: 2 }} />
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Dog Name"
                      value={formData.dogName}
                      onChange={handleInputChange('dogName')}
                      required
                      helperText="Enter the name of the dog"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Owner Name"
                      value={formData.ownerName}
                      onChange={handleInputChange('ownerName')}
                      required
                      helperText="Enter the owner's name"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Owner Email"
                      type="email"
                      value={formData.ownerEmail}
                      onChange={handleInputChange('ownerEmail')}
                      required
                      helperText="Enter a valid email address"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      select
                      label="Age Category"
                      value={formData.ageCategory}
                      onChange={handleInputChange('ageCategory')}
                      required
                    >
                      {AGE_CATEGORIES.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Next Training Date"
                      type="date"
                      value={formData.nextTrainingDate}
                      onChange={handleInputChange('nextTrainingDate')}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Submit Button */}
          <Grid item xs={12}>
            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button
                variant="outlined"
                onClick={() => navigate('/protocol-name-overview')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
                disabled={loading || !isFormValid()}
              >
                {loading ? 'Creating...' : 'Create Protocol'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};
```

## Field Type Mapping

Map NPL types to form components:

| NPL Type | Form Component | Example |
|----------|---------------|---------|
| `Text` | `TextField` | Name, description |
| `Number` | `TextField` (type="number") | Amount, quantity |
| `LocalDate` | `TextField` (type="date") | Date fields |
| `DateTime` | `TextField` (type="datetime-local") | Timestamp fields |
| `Boolean` | `Switch` or `Checkbox` | Toggle fields |
| `Currency` | `Autocomplete` (select from currencies) | Currency selection |
| `Enum` | `TextField` (select) | Dropdown options |
| `List<T>` | Dynamic list with add/remove | Collections |
| `Map<K,V>` | Key-value pairs | Mappings |

## Validation from NPL Require Statements

Extract validation rules from NPL `require()` statements:

```npl
require(dogName.length() > 0, "Dog name is required");
require(ownerEmail.contains("@"), "Valid email is required");
require(ageCategory != null, "Age category must be selected");
```

Map to form validation:

```typescript
const validateForm = (): string | null => {
  if (!formData.dogName.trim()) {
    return 'Dog name is required';
  }
  if (!formData.ownerEmail.includes('@')) {
    return 'Valid email is required';
  }
  if (!formData.ageCategory) {
    return 'Age category must be selected';
  }
  return null;
};
```

## Protocol Reference Fields

For fields that reference other protocols (e.g., `Currency`, `Equity`):

```typescript
// Fetch available options
const [currencies, setCurrencies] = useState<Currency[]>([]);

useEffect(() => {
  const fetchCurrencies = async () => {
    const response = await services.api.getCurrencyList({
      page: 1,
      pageSize: 100
    });
    setCurrencies(response.items || []);
  };
  fetchCurrencies();
}, []);

// Use Autocomplete for selection
<Autocomplete
  options={currencies}
  value={currencies.find(c => c.id === formData.currency) || null}
  onChange={(event, newValue) => {
    setFormData(prev => ({
      ...prev,
      currency: newValue?.id || ''
    }));
  }}
  getOptionLabel={(option) => `${option.iSOCode} - ${option.name}`}
  renderInput={(params) => (
    <TextField
      {...params}
      label="Currency"
      required
    />
  )}
/>
```

## Form Sections

Group related fields into sections:

1. **Basic Information** - Required core fields
2. **Additional Details** - Optional fields
3. **Configuration** - Settings and options
4. **Relationships** - References to other protocols

## Success Handling

After successful creation:

```typescript
setSuccess(true);
setTimeout(() => {
  navigate('/protocol-name-overview');
}, 2000);
```

## Route Configuration

Add route in `Router.tsx`:

```typescript
{
  path: '/protocol-name-create',
  element: <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
    {withSuspense(ProtocolNameCreationForm)}
  </RoleProtectedRoute>
}
```

## Next Steps

Once creation forms are generated, proceed to:
- [09-ACTION-BUTTONS.md](./09-ACTION-BUTTONS.md) - Generate action button library

