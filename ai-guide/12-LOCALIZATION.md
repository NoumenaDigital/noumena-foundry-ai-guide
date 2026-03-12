# 12 - Localization (i18n)

## Overview

The application uses `react-i18next` for internationalization (i18n) and supports multiple languages. The current implementation supports English (en) and German (de), but can be extended to support additional languages.

## Setup

### Step 1: Install Dependencies

The following packages are required (should already be in `package.json`):

```json
{
  "dependencies": {
    "i18next": "^23.x.x",
    "react-i18next": "^13.x.x",
    "i18next-browser-languagedetector": "^7.x.x"
  }
}
```

### Step 2: Initialize i18n

Create `src/i18n/index.ts`:

```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Translation files
import enTranslations from './locales/en.json'
import deTranslations from './locales/de.json'

const resources = {
  en: {
    translation: enTranslations
  },
  de: {
    translation: deTranslations
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    debug: false,

    interpolation: {
      escapeValue: false // react already does escaping
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  })

export default i18n
```

### Step 3: Import in Main Entry Point

In `src/main.tsx`, import the i18n configuration:

```typescript
import './i18n'; // Initialize i18n
```

## Translation Files

### Structure

Translation files are located in `src/i18n/locales/`:

```
src/i18n/locales/
├── en.json
└── de.json
```

### Translation File Format

Each translation file is a JSON object with nested keys:

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "create": "Create",
    "edit": "Edit",
    "delete": "Delete"
  },
  "navigation": {
    "structuredProducts": "Structured Products",
    "dashboard": "Dashboard",
    "overview": "Overview"
  },
  "language": {
    "english": "English",
    "german": "German",
    "switchLanguage": "Switch Language"
  },
  "tooltips": {
    "expandSidebar": "Expand Sidebar",
    "collapseSidebar": "Collapse Sidebar"
  }
}
```

### Adding New Languages

To add a new language (e.g., French):

1. **Create translation file**: `src/i18n/locales/fr.json`
2. **Import in i18n/index.ts**:
   ```typescript
   import frTranslations from './locales/fr.json'
   
   const resources = {
     en: { translation: enTranslations },
     de: { translation: deTranslations },
     fr: { translation: frTranslations }
   }
   ```
3. **Update LanguageSwitcher component** to include the new language

## Using Translations in Components

### Basic Usage

```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.title')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
};
```

### With Default Values

```typescript
const { t } = useTranslation();

// If key doesn't exist, use the default value
const label = t('navigation.customLabel', 'Default Label');
```

### With Interpolation

```typescript
const { t } = useTranslation();

// Translation file: { "welcome": "Welcome, {{name}}!" }
const message = t('welcome', { name: 'John' });
```

### Changing Language Programmatically

```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };
  
  return (
    <button onClick={() => changeLanguage('de')}>
      Switch to German
    </button>
  );
};
```

## Language Switcher Component

### Implementation

Create `src/components/shared/LanguageSwitcher.tsx`:

```typescript
import React from 'react'
import {
    Button,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Tooltip
} from '@mui/material'
import { Check } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

const LanguageSwitcher: React.FC = () => {
    const { i18n, t } = useTranslation()
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
    const open = Boolean(anchorEl)
    
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget)
    }
    
    const handleClose = () => {
        setAnchorEl(null)
    }
    
    const handleLanguageChange = (language: string) => {
        i18n.changeLanguage(language)
        handleClose()
    }
    
    const languages = [
        { code: 'en', name: t('language.english'), flag: '🇺🇸' },
        { code: 'de', name: t('language.german'), flag: '🇩🇪' }
    ]
    
    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0]
    
    return (
        <>
            <Tooltip title={t('language.switchLanguage')}>
                <Button
                    onClick={handleClick}
                    size="small"
                    sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        minWidth: 'auto',
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        px: 1,
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            color: '#ffffff'
                        }
                    }}
                    aria-controls={open ? 'language-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    startIcon={
                        <span style={{ fontSize: '16px' }}>
                            {currentLanguage.flag}
                        </span>
                    }
                >
                    {currentLanguage.code.toUpperCase()}
                </Button>
            </Tooltip>
            <Menu
                id="language-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                onClick={handleClose}
                PaperProps={{
                    elevation: 0,
                    sx: {
                        overflow: 'visible',
                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                        mt: 1.5,
                        minWidth: 150,
                        '&:before': {
                            content: '""',
                            display: 'block',
                            position: 'absolute',
                            top: 0,
                            right: 14,
                            width: 10,
                            height: 10,
                            bgcolor: 'background.paper',
                            transform: 'translateY(-50%) rotate(45deg)',
                            zIndex: 0,
                        },
                    },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                {languages.map((language) => (
                    <MenuItem 
                        key={language.code}
                        onClick={() => handleLanguageChange(language.code)}
                        selected={language.code === i18n.language}
                    >
                        <ListItemIcon>
                            {language.code === i18n.language ? (
                                <Check fontSize="small" />
                            ) : (
                                <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>
                                    {language.flag}
                                </span>
                            )}
                        </ListItemIcon>
                        <ListItemText>
                            {language.name}
                        </ListItemText>
                    </MenuItem>
                ))}
            </Menu>
        </>
    )
}

export default LanguageSwitcher
```

### Integration in Sidebar

The LanguageSwitcher is typically placed in the sidebar footer:

```typescript
import LanguageSwitcher from './LanguageSwitcher';

// In sidebar footer
<Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
  <ThemeToggle />
  <LanguageSwitcher />
</Box>
```

## Translation Keys Organization

### Recommended Structure

Organize translation keys by feature/domain:

```json
{
  "common": {
    // Common UI elements (buttons, labels, etc.)
  },
  "navigation": {
    // Navigation menu items
  },
  "protocols": {
    // Protocol-specific translations
    "accumulator": {
      "title": "Accumulator",
      "create": "Create Accumulator",
      "details": "Accumulator Details"
    }
  },
  "forms": {
    // Form labels and validation messages
  },
  "errors": {
    // Error messages
  },
  "tooltips": {
    // Tooltip text
  },
  "language": {
    // Language switcher labels
  }
}
```

## Best Practices

1. **Always use translation keys**: Never hardcode user-facing strings
2. **Provide default values**: Use fallback values for missing translations
3. **Use namespaced keys**: Organize keys hierarchically for maintainability
4. **Keep keys consistent**: Use the same key structure across similar features
5. **Test all languages**: Verify translations in all supported languages
6. **Handle pluralization**: Use i18next's pluralization features when needed
7. **Date/Number formatting**: Use i18next's formatting features for locale-specific formatting

## Testing Translations

### In Tests

```typescript
import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

const AllProviders = ({ children }) => (
  <I18nextProvider i18n={i18n}>
    {children}
  </I18nextProvider>
);

// In your test
render(<MyComponent />, { wrapper: AllProviders });
```

### Manual Testing

1. Change language using the LanguageSwitcher
2. Verify all UI elements are translated
3. Check that language preference persists (stored in localStorage)
4. Test browser language detection

## Language Detection

The application automatically detects the user's preferred language in this order:

1. **localStorage**: Previously selected language
2. **navigator**: Browser language settings
3. **htmlTag**: HTML lang attribute

The detected language is cached in localStorage for persistence across sessions.

## Next Steps

- [13-KEYCLOAK-THEMING.md](./13-KEYCLOAK-THEMING.md) - Localize Keycloak login pages

