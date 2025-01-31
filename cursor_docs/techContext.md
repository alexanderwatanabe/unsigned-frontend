# Technical Context

## Technologies Used
- SvelteKit (v5.0.0)
- TypeScript
- TailwindCSS
- Vite
- Vercel for deployment and analytics
- Cardano blockchain integration
- Web3 wallet connectivity

## Development Setup
- Node.js environment
- Package management via npm
- Development server available via `npm run dev`
- Build process via `npm run build`
- TypeScript type checking via `npm run check`

## Technical Constraints
- Must maintain compatibility with Vercel deployment
- TypeScript for type safety
- Responsive design requirements via Tailwind
- Secure wallet connection handling
- Cross-browser compatibility
- Mobile-first design approach
- Maximum of 31,119 total items
- Image sizes must match grid layout
- S3 bucket path structure: `images/{size}/{paddedIndex}.png`
- Page size must be perfect square (1, 4, 9, 16, 25, etc)
- Maximum of 6 concurrent filters
- Debounced search with 300ms delay

## Dependencies
### Core
- SvelteKit and related packages
- TailwindCSS with typography plugin
- Vercel Analytics
- Cardano wallet connectors
- Web3 utilities

### Development
- TypeScript
- Vite
- SvelteCheck for type checking
- ESLint for code quality
- Prettier for code formatting
- Various build tools and adapters

### State Management
- Svelte stores for reactive state
- Custom wallet state management
- Persistent storage handling
- Svelte 5 $state for reactive variables
- $effect for handling side effects
- Url-based state persistence

### UI Components
- Custom wallet connection components
- Gallery grid system
- NFT display components
- Loading and error states
- Modal systems

### Security
- Secure wallet connection handling
- Type-safe blockchain interactions
- Environment variable management

## Performance Considerations
- Lazy loading for gallery images
- Optimized wallet connection
- Responsive image handling
- Type-safe code execution
- Lazy loading for images
- Prefetch adjacent pages
- Optimize image size based on grid
- Debounce search input
- Efficient state updates
- Prevent unnecessary rerenders

## Filtering Implementation
The gallery's filtering system is implemented with:
- server-side filtering for performance
- typescript for type safety
- svelte 5 rune syntax for reactivity
- proper error handling and validation

### Key Components:
1. Frontend:
   - filter row management
   - property selection ui
   - type-safe event handling
   - state management

2. Backend:
   - layer-aware property matching
   - efficient filtering algorithm
   - pagination support
   - proper error handling

3. Data flow:
   - client builds filter parameters
   - server processes filters
   - results are paginated
   - state is maintained

### Technical Constraints:
- must handle large datasets efficiently
- needs to support complex property combinations
- requires proper type safety
- must maintain consistent state

Note: Dependencies will be updated as new requirements emerge. 