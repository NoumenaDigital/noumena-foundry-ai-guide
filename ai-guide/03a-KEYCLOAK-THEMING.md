# 03a - Keycloak Login Theme Customization

## Overview

> ⚠️ **MANDATORY when restyling:** Keycloak login theme customization is **REQUIRED** when the restyling phase is executed. You MUST create and configure a custom Keycloak login theme to match the application branding.

**Why important:**
- The login page is the first impression users have of your application
- A branded login experience is essential for professional applications

This guide covers how to create and apply a custom Keycloak theme for the login pages to match your application's branding.

> ⚠️ **IMPORTANT:** The theme folder name must match the application slug (the `app_name` variable used in Terraform). For example, if your app is called `feedbacksystem`, create the theme in `keycloak/theme/feedbacksystem/`. The build system will automatically detect the theme and update the Terraform `login_theme` variable accordingly. **DO NOT manually edit `keycloak-provisioning/variables.tf`** — the build system handles this.

## Theme Structure

### Directory Structure

Keycloak themes are located in `keycloak/theme/`:

```
keycloak/theme/
└── APPNAME/                # Theme name - must match the application slug
    ├── login/
    │   ├── theme.properties
    │   ├── template.ftl
    │   ├── login.ftl
    │   └── resources/
    │       ├── css/
    │       │   └── login.css
    │       └── img/
    │           └── logo.png (optional)
    └── email/               # Optional: email templates
        └── ...
```

## Theme Configuration

### theme.properties

Create `keycloak/theme/APPNAME/login/theme.properties`:

```properties
parent=keycloak
import=common/keycloak
styles=css/login.css
```

**Properties:**
- `parent`: Base theme to inherit from (usually `keycloak`)
- `import`: Additional theme resources to import
- `styles`: CSS file path relative to `resources/` directory

## Template Files

### template.ftl (Base Layout)

Create `keycloak/theme/APPNAME/login/template.ftl`:

```freemarker
<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false showAnotherWayIfPresent=true>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">

<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="robots" content="noindex, nofollow">

    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link href="${url.resourcesPath}/css/login.css" rel="stylesheet" />
</head>

<body class="app-theme">
    <div class="login-pf-page">
        <div class="card-pf">
            <#nested "header">
            <div id="kc-content">
                <div id="kc-content-wrapper">
                    <#-- App-initiated actions should not see warning messages about the need to complete the action -->
                    <#-- during login.                                                                               -->
                    <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                        <div class="alert-${message.type}">
                            <#if message.type = 'success'><span class="${properties.kcFeedbackSuccessIcon!}"></span></#if>
                            <#if message.type = 'warning'><span class="${properties.kcFeedbackWarningIcon!}"></span></#if>
                            <#if message.type = 'error'><span class="${properties.kcFeedbackErrorIcon!}"></span></#if>
                            <#if message.type = 'info'><span class="${properties.kcFeedbackInfoIcon!}"></span></#if>
                            <span class="message-text">${kcSanitize(message.summary)?no_esc}</span>
                        </div>
                    </#if>

                    <#nested "form">

                    <#if displayInfo>
                        <div id="kc-info">
                            <div id="kc-info-wrapper">
                                <#nested "info">
                            </div>
                        </div>
                    </#if>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
</#macro>
```

### login.ftl (Login Form)

Create `keycloak/theme/APPNAME/login/login.ftl`:

```freemarker
<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=true displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "header">
        <h1>Welcome</h1>
        <p>
            Sign in to access your application.
        </p>
    <#elseif section = "form">
        <div id="kc-form">
            <div id="kc-form-wrapper">
                <#if realm.password>
                    <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                        <div class="form-group">
                            <label for="username">Username or email</label>
                            <input tabindex="1" id="username" class="form-control" name="username" value="${(login.username!'')}"  type="text" autofocus autocomplete="off"
                                aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
                            />
                        </div>

                        <div class="form-group">
                            <label for="password">Password</label>
                            <input tabindex="2" id="password" class="form-control" name="password" type="password" autocomplete="off"
                                aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
                            />
                        </div>

                        <div id="kc-form-buttons" class="form-group">
                            <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                            <input tabindex="4" class="btn btn-primary" name="login" id="kc-login" type="submit" value="Sign In"/>
                            <#if realm.registrationAllowed && !registrationDisabled??>
                                <div style="margin-top: 50px; text-align: center;">
                                    <p style="margin-bottom: 10px;">Not yet registered?</p>
                                    <button type="button" onclick="window.location.href='${url.registrationUrl}'" class="btn btn-primary">Sign Up</button>
                                </div>
                            </#if>
                        </div>
                    </form>
                </#if>
            </div>
        </div>
    </#if>
</@layout.registrationLayout>
```

## CSS Styling

### login.css

Create `keycloak/theme/APPNAME/login/resources/css/login.css`:

```css
/* Keycloak Login Theme - Customize colors and fonts to match your brand */
@import url('https://fonts.googleapis.com/css2?family=Lato:wght@100;300;400;700;900&display=swap');

:root {
    /* Customize these colors to match your application branding */
    --accent1: #120A4D;
    --accent1-light: #20127C;
    --accent2: #DD2C8D;
    --accent3: #FA8B45;
    --accent4: #0BD2A2;
    --background1: #000000;
    --background2: #ffffff;
    --background3: #f5f5f5;
    --text-primary: #000000;
    --text-secondary: #6b7280;
    
    /* Primary color for buttons and accents */
    --primary-color: var(--accent1);
    --secondary-color: var(--text-secondary);
    --font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

body, html {
    height: 100%;
    margin: 0;
    padding: 0;
}

body {
    font-family: var(--font-family);
}

.login-pf-page {
    min-height: 100vh;
    min-width: 100vw;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
}

.login-pf-page::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    /* Elegant gradient background */
    background: linear-gradient(135deg, var(--accent1) 0%, var(--accent1-light) 50%, var(--accent2) 100%);
    z-index: 1;
}

.login-pf-page::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    /* Elegant radial glow overlay */
    background: radial-gradient(ellipse at center, rgba(221, 44, 141, 0.3) 0%, rgba(18, 10, 77, 0.5) 50%, rgba(0, 0, 0, 0.7) 100%);
    z-index: 2;
}

/* Card styles */
.card-pf {
    position: relative;
    z-index: 3;
    max-width: 500px;
    margin: 2rem auto;
    padding: 3rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    background-color: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Title styles */
h1 {
    font-family: var(--font-family);
    font-size: 28px;
    font-weight: 700;
    color: var(--accent1);
    margin: 2rem 0 1rem;
    text-align: center;
    letter-spacing: -0.5px;
}

p {
    font-family: var(--font-family);
    font-size: 16px;
    color: var(--text-secondary);
    text-align: center;
    margin-bottom: 2rem;
    line-height: 1.6;
    font-weight: 400;
}

/* Form styles */
.form-group {
    margin-bottom: 1.5rem;
}

label {
    font-family: var(--font-family);
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 0.5rem;
    display: block;
    color: var(--accent1);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.form-control {
    width: 100%;
    padding: 0.875rem 1rem;
    font-family: var(--font-family);
    font-size: 16px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-sizing: border-box;
    transition: all 0.2s ease;
    background-color: var(--background2);
}

.form-control:focus {
    border-color: var(--accent1);
    outline: none;
    box-shadow: 0 0 0 3px rgba(18, 10, 77, 0.1);
    background-color: var(--background2);
}

/* Button styles */
.btn-primary {
    background: linear-gradient(135deg, var(--accent1) 0%, var(--accent1-light) 100%);
    border: none;
    padding: 0.875rem 1.5rem;
    border-radius: 8px;
    color: white;
    font-family: var(--font-family);
    font-size: 16px;
    font-weight: 500;
    width: 100%;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(18, 10, 77, 0.3);
    text-transform: none;
    letter-spacing: 0.3px;
}

.btn-primary:hover {
    background: linear-gradient(135deg, var(--accent1-light) 0%, var(--accent2) 100%);
    box-shadow: 0 4px 12px rgba(18, 10, 77, 0.4);
    transform: translateY(-1px);
}

.btn-primary:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(18, 10, 77, 0.3);
}

/* Alert/Message styles */
.alert-error,
.alert-warning,
.alert-info,
.alert-success {
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    font-family: var(--font-family);
    font-size: 14px;
    border-left: 4px solid;
}

.alert-error {
    background-color: rgba(239, 68, 68, 0.1);
    border-left-color: #ef4444;
    color: #b91c1c;
}

.alert-warning {
    background-color: rgba(250, 139, 69, 0.1);
    border-left-color: var(--accent3);
    color: #b45309;
}

.alert-info {
    background-color: rgba(11, 210, 162, 0.1);
    border-left-color: var(--accent4);
    color: #15803d;
}

.alert-success {
    background-color: rgba(11, 210, 162, 0.1);
    border-left-color: var(--accent4);
    color: #15803d;
}

.message-text {
    display: block;
    margin-top: 0.25rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .card-pf {
        max-width: 90%;
        padding: 2rem;
        margin: 1rem;
    }
    
    h1 {
        font-size: 24px;
    }
    
    .form-control {
        min-width: auto;
    }
}
```

## Docker Integration

### Dockerfile

The theme must be copied into the Keycloak container. Update `keycloak/Dockerfile`:

```dockerfile
FROM quay.io/keycloak/keycloak:25.0.4

# ... other setup ...

# Copy custom theme (folder name must match app slug)
COPY theme/APPNAME /opt/keycloak/themes/APPNAME

# ... rest of Dockerfile ...
```

## How the Theme Gets Applied

The build system handles wiring the theme to Terraform automatically:

1. You create the theme files in `keycloak/theme/APPNAME/`
2. You update `keycloak/Dockerfile` to COPY the theme
3. The build system detects the theme folder and updates `keycloak-provisioning/variables.tf` to set `login_theme` to the theme name
4. When `make up` runs, Terraform applies the theme to the Keycloak realm

**Do NOT manually edit** `keycloak-provisioning/variables.tf` to set the `login_theme` — the build system handles this.

## Customization Tips

### Color Scheme

Update CSS variables in `login.css` to match your brand:

```css
:root {
    --accent1: #YOUR_PRIMARY_COLOR;
    --accent2: #YOUR_SECONDARY_COLOR;
    /* ... */
}
```

### Logo

Add a logo image:

1. Place logo in `keycloak/theme/APPNAME/login/resources/img/logo.png`
2. Reference in template:
   ```html
   <img src="${url.resourcesPath}/img/logo.png" alt="Logo" />
   ```

### Fonts

Use custom fonts by importing in CSS:

```css
@import url('https://fonts.googleapis.com/css2?family=YourFont:wght@400;700&display=swap');

:root {
    --font-family: 'YourFont', sans-serif;
}
```

### Additional Templates

You can customize other Keycloak pages:

- `register.ftl` - Registration page
- `error.ftl` - Error page
- `info.ftl` - Info page
- `email/` - Email templates

## Testing

### Local Testing

1. Build the Keycloak Docker image with your theme
2. Start Keycloak container
3. Access login page and verify styling
4. Test responsive design on mobile devices

### Theme Development Workflow

1. Make changes to theme files
2. Rebuild Docker image: `docker-compose build keycloak`
3. Restart container: `docker-compose restart keycloak`
4. Clear browser cache and refresh login page

## Best Practices

1. **Use CSS Variables**: Define colors and fonts as CSS variables for easy customization
2. **Responsive Design**: Ensure theme works on mobile devices
3. **Accessibility**: Maintain proper contrast ratios and keyboard navigation
4. **Consistent Branding**: Match theme with your application's design system
5. **Test All Pages**: Verify theme works on login, registration, error, and info pages
6. **Version Control**: Keep theme files in version control
7. **Documentation**: Document custom CSS classes and template variables

## Troubleshooting

### Theme Not Appearing

- Verify theme directory structure matches Keycloak's expected format
- Check that theme name in Admin Console matches directory name
- Ensure CSS file path in `theme.properties` is correct
- Clear browser cache and Keycloak cache

### CSS Not Loading

- Verify `styles` property in `theme.properties` points to correct CSS file
- Check that CSS file is in `resources/css/` directory
- Ensure file permissions allow Keycloak to read the files

### Template Errors

- Check FreeMarker syntax in `.ftl` files
- Verify all required macros and variables are defined
- Check Keycloak logs for template compilation errors

## Next Steps

- [12-LOCALIZATION.md](./12-LOCALIZATION.md) - Localize Keycloak login pages
- [03-KEYCLOAK-PROVISIONING.md](./03-KEYCLOAK-PROVISIONING.md) - Keycloak setup and configuration
