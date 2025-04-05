# Technical Context

## Technologies Used

### Frontend Framework
- SvelteKit 2.0+
- Svelte 5 with runes
- TypeScript 5.0+
- Vite for building

### Styling
- TailwindCSS
- PostCSS
- CSS Grid for layout
- CSS Variables for theming
- CSS Animations for feedback

### Development Tools
- Node.js 18+
- pnpm for package management
- ESLint for linting
- Prettier for formatting
- Vitest for testing

### Blockchain Integration
- Mesh SDK (@meshsdk/svelte)
- Cardano blockchain
- Transaction building
- Asset management

### Deployment
- Vercel for hosting
- AWS S3 for image assets
- CloudFront for CDN
- GitHub Actions for CI/CD

## Development Setup

### Prerequisites
```bash
# Required software
- Node.js 18+
- pnpm
- Git

# Environment setup
pnpm install
pnpm dev # for development
pnpm build # for production build
pnpm preview # for production preview
```

### Environment Variables
```bash
# Environment variables needed for the application
POSTGRES_URL="postgres://neondb_owner:npg_GoYmh8Iknz0f@ep-delicate-shadow-a2mhoq1s-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require"
PUBLIC_IMAGES_DOMAIN=
PUBLIC_METADATA_URL=
PUBLIC_NOLINERS_URL=
```

### SvelteKit Environment Modules
- `$env/static/private`: For server-side environment variables known at build time
- `$env/dynamic/private`: For server-side environment variables that may change
- `$env/static/public`: For client-side environment variables (must be prefixed with PUBLIC_)
- `$env/dynamic/public`: For client-side environment variables that may change

These modules are built into SvelteKit and don't need to be installed separately.

### Development Commands
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm test` - Run tests
- `pnpm lint` - Run linter
- `pnpm format` - Format code

## Technical Constraints

### Browser Support
- Modern browsers only (Chrome, Firefox, Safari, Edge)
- No IE11 support required
- Mobile browsers supported
- CSS Grid and Custom Properties required

### Performance Requirements
- Initial page load < 2s
- Time to interactive < 3s
- First contentful paint < 1.5s
- Core Web Vitals compliance
- Smooth animations (60fps)

### Image Handling
- Multiple resolution support (128px, 256px, 1024px)
- Lazy loading required
- Progressive loading
- Prefetching for adjacent pages
- Resolution based on view mode

### State Management
- Svelte 5 runes for reactivity
- URL-based state for sharing
- Clean state transitions
- Proper cleanup on unmount
- Mode-specific behaviors
- Grid state management
- Transaction state handling

### Security
- No sensitive data in frontend
- CORS compliance
- Content Security Policy
- XSS prevention
- Safe event handling
- Secure transaction building

### Accessibility
- WCAG 2.1 compliance
- Keyboard navigation
- Screen reader support
- Proper ARIA attributes
- Visual feedback for interactions

### User Experience
- Keyboard shortcuts with visual indicators
- Smooth transitions between states
- Clear loading states
- Responsive layout
- Touch support (planned)
- Grid-based interactions
- Transaction feedback

## Development Practices
1. Type-safe development
2. Component-based architecture
3. Responsive design first
4. Performance optimization
5. Accessibility compliance
6. Clean code principles
7. Visual feedback for all actions

## Dependencies
### Core
- SvelteKit and related packages
- TailwindCSS with typography plugin
- Vercel Analytics
- AWS SDK for image handling
- Mesh SDK for wallet integration

### Development
- TypeScript
- Vite
- SvelteCheck for type checking
- Various build tools and adapters
- Testing utilities

Note: Dependencies will be updated as new requirements emerge.

## Wallet Integration
- Mesh SDK (@meshsdk/svelte)
- Cardano blockchain integration
- Asset filtering and parsing
- Transaction building
- UTxO management

## Image Handling
- S3 bucket hosting: s3.ap-northeast-1.amazonaws.com
- Multiple resolution tiers
- Lazy loading and prefetching
- Grid-based optimization

## State Management
- Svelte 5 runes ($state, $derived)
- Browser environment detection
- Reactive wallet state
- Grid position tracking
- Transaction building state

## Data Processing
- Asset unit parsing
- Index extraction
- Policy ID filtering
- Sorting and pagination
- Grid metadata handling
- Transaction preparation

## Grid Management
- Dynamic sizing (m x n)
- Position tracking
- Cell interaction
- Clear functionality
- Visual feedback
- Selection handling

## Transaction Building
- Single UTxO output
- Grid metadata
- Asset collection
- Error handling
- Loading states
- Success feedback 