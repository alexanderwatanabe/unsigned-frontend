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
```
PUBLIC_IMAGES_DOMAIN=
PUBLIC_METADATA_URL=
PUBLIC_NOLINERS_URL=
```

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

### Security
- No sensitive data in frontend
- CORS compliance
- Content Security Policy
- XSS prevention
- Safe event handling

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

### Development
- TypeScript
- Vite
- SvelteCheck for type checking
- Various build tools and adapters
- Testing utilities

Note: Dependencies will be updated as new requirements emerge. 