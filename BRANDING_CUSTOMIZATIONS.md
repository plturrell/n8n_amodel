# aModels n8n Branding Customizations

This document details all customizations applied to n8n to match aModels visual identity.

## Overview

n8n has been customized with aModels branding to provide a seamless, integrated experience within the aModels platform. All customizations are non-invasive and can be updated when n8n is upgraded.

## Customization Inventory

### 1. Logo Files

**Location**: `packages/frontend/@n8n/design-system/src/components/N8nLogo/`

#### logo-icon.svg
- **Original**: Pink n8n workflow icon (#EA4B71)
- **Customized**: Blue aModels workflow icon (#0066CC)
- **Purpose**: Main logo icon displayed in sidebar and header

#### logo-text.svg
- **Original**: "n8n" text logo
- **Customized**: "aModels Workflows" text
- **Purpose**: Logo text displayed alongside icon

### 2. Theme Override

**Location**: `packages/frontend/editor-ui/src/app/css/_amodels-theme.scss`

This file overrides n8n's CSS variables with aModels design tokens:

#### Color Mappings

| n8n Variable | aModels Value | Purpose |
|--------------|---------------|---------|
| `--color--primary` | `#0066CC` | Primary brand color |
| `--color--primary--shade-1` | `#0052A3` | Hover/active states |
| `--color--primary--tint-1` | `#3385D6` | Light accents |
| `--color--primary--tint-3` | `#E8F4FF` | Very light backgrounds |
| `--color--success` | `#10B981` | Success states |
| `--color--warning` | `#F59E0B` | Warning states |
| `--color--danger` | `#EF4444` | Error states |

#### Typography

- **Font Family**: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif`
- **Font Smoothing**: Antialiased for crisp rendering
- **Letter Spacing**: -0.02em for headings

#### Spacing

All spacing follows aModels 8px grid system:
- `--spacing-2xs`: 8px
- `--spacing-xs`: 12px
- `--spacing-s`: 16px
- `--spacing-m`: 20px
- `--spacing-l`: 24px
- `--spacing-xl`: 32px

#### Border Radius

- `--border-radius-base`: 8px
- `--border-radius-large`: 12px
- `--border-radius-xlarge`: 16px

#### Shadows

- `--box-shadow-base`: `0 2px 4px rgba(0, 0, 0, 0.06)`
- `--box-shadow-light`: `0 2px 8px rgba(0, 0, 0, 0.1)`
- `--box-shadow-medium`: `0 4px 12px rgba(0, 0, 0, 0.15)`

### 3. HTML Metadata

**Location**: `packages/frontend/editor-ui/index.html`

#### Changes

- **Page Title**: `n8n.io - Workflow Automation` → `aModels Workflows - Workflow Automation`
- **Noscript Message**: Updated to reference "aModels Workflows"

### 4. CSS Import

**Location**: `packages/frontend/editor-ui/src/app/css/index.scss`

Added import for aModels theme:
```scss
@use 'amodels-theme';
```

This ensures the theme overrides are loaded after variables but before other styles.

## Build Process

### Building n8n with Customizations

```bash
# From project root
./services/agentflow/scripts/build-n8n.sh
```

This script:
1. Validates customizations are in place
2. Installs dependencies (if needed)
3. Builds n8n with aModels branding

### Starting Customized n8n

```bash
# Development mode
./services/agentflow/scripts/dev-n8n.sh

# Production mode
./services/agentflow/scripts/start-n8n.sh
```

## Verification Checklist

After building, verify the following:

- [ ] Logo in sidebar shows aModels icon (blue, not pink)
- [ ] Logo text reads "aModels Workflows"
- [ ] Page title is "aModels Workflows - Workflow Automation"
- [ ] Primary color throughout UI is #0066CC (blue)
- [ ] Buttons use aModels blue (#0066CC)
- [ ] Hover states use darker blue (#0052A3)
- [ ] Typography matches aModels (system fonts, antialiased)
- [ ] Border radius is 8px/12px (not sharp corners)
- [ ] Spacing follows 8px grid
- [ ] Shadows are subtle and consistent with aModels

## Updating n8n

When updating n8n to a new version:

1. **Pull latest n8n**:
   ```bash
   cd infrastructure/third_party/n8n
   git fetch origin
   git checkout <new-version-tag>
   ```

2. **Reapply customizations**:
   - Logo files should persist (not tracked by n8n git)
   - Theme file should persist
   - HTML changes may need to be reapplied
   - CSS import may need to be reapplied

3. **Test thoroughly**:
   ```bash
   ./services/agentflow/scripts/build-n8n.sh
   ./services/agentflow/scripts/dev-n8n.sh
   ```

4. **Check for conflicts**:
   - Review n8n changelog for CSS variable changes
   - Test all major UI areas
   - Verify branding is still applied

## Troubleshooting

### Logo not showing

- Check that SVG files exist in `packages/frontend/@n8n/design-system/src/components/N8nLogo/`
- Verify Logo.vue component is importing the correct files
- Clear browser cache and rebuild

### Theme not applied

- Verify `_amodels-theme.scss` exists
- Check that it's imported in `index.scss`
- Look for CSS compilation errors in build output
- Ensure `!important` flags are present in theme file

### Build fails

- Check that n8n submodule is initialized
- Run `pnpm install` in n8n directory
- Check for TypeScript/SCSS compilation errors
- Verify all customization files are valid

### Colors revert to n8n defaults

- CSS variables may have been overridden by n8n update
- Check specificity of selectors in theme file
- Add `!important` flags if needed
- Review n8n's new CSS structure

## File Locations Summary

```
infrastructure/third_party/n8n/
├── packages/frontend/
│   ├── @n8n/design-system/src/components/N8nLogo/
│   │   ├── logo-icon.svg          [CUSTOMIZED]
│   │   └── logo-text.svg          [CUSTOMIZED]
│   └── editor-ui/
│       ├── index.html             [CUSTOMIZED]
│       └── src/app/css/
│           ├── _amodels-theme.scss [NEW]
│           └── index.scss         [CUSTOMIZED]

services/agentflow/scripts/
├── build-n8n.sh                   [NEW]
├── dev-n8n.sh                     [EXISTING]
└── start-n8n.sh                   [EXISTING]
```

## Design Token Reference

For reference, here are the complete aModels design tokens used:

```css
/* Primary Colors */
--color-primary: #0066CC
--color-primary-hover: #0052A3
--color-primary-light: #E8F4FF

/* Surface Colors */
--color-bg-base: #F8F9FA
--color-surface: #FFFFFF
--color-surface-elevated: #FAFBFC

/* Text Colors */
--color-text-primary: #1A1D21
--color-text-secondary: #5A6872
--color-text-tertiary: #8B9CAB

/* Border Colors */
--color-border-base: #E1E5E9
--color-border-hover: #C8D1DA
--color-border-subtle: #F1F3F5

/* Accent Colors */
--accent-indigo: #6366F1
--accent-success: #10B981
--accent-warning: #F59E0B
--accent-error: #EF4444
```

## Future Enhancements

Potential future branding improvements:

- [ ] Custom favicon matching aModels icon
- [ ] Loading screen with aModels branding
- [ ] Custom error pages
- [ ] Branded email templates (for notifications)
- [ ] Custom node icons matching aModels style
- [ ] Branded documentation/help content
- [ ] Custom onboarding flow

## Maintenance

This customization should be reviewed:
- **When upgrading n8n**: Check for conflicts
- **When updating aModels design system**: Update theme tokens
- **Quarterly**: Verify branding is still applied correctly
- **After major UI changes**: Test all customized areas

## Contact

For questions about n8n branding customizations, refer to:
- Implementation plan: `implementation_plan.md`
- n8n integration docs: `services/agentflow/docs/n8n-integration.md`
