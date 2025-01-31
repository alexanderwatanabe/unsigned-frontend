# System Patterns

## Architecture
- SvelteKit-based frontend application
- File-based routing system
- API routes under src/routes/api
- Component-based architecture
- TypeScript for type safety
- Reactive state management
- Service-based functionality separation
- Marketplace integration layer
- Composition management system
- History tracking system
- Collection management system

## Current Architecture Focus
### Core Systems
- Gallery and viewing system
- Collection management
- Composition tools
- History tracking
- Marketplace integration
- Performance optimization

### Future Systems (Ethereum Phase)
- Cross-chain migration system
- Blockchain monitoring service
- Dual-chain algorithm execution
- Reminting management system

## Key Technical Decisions
- Use of SvelteKit for modern web framework capabilities
- Tailwind for styling and responsive design
- Vercel for deployment and analytics
- TypeScript for enhanced development experience
- API routes for backend functionality
- Svelte stores for state management
- Service layer for business logic
- Component composition for UI reusability
- JPG.store API integration
- Canvas-based composition system

## Design Patterns
- Component-based UI architecture
- Route-based page organization
- Type-safe development practices
- API-first approach for data handling
- Reactive state management
- Service layer abstraction
- Event-driven architecture
- Dependency injection via services
- Composition pattern for creative tools
- Observer pattern for marketplace updates

## Code Organization
### Components
- Shared components in lib/components
- Page-specific components in routes
- Wallet-related components isolated
- Type-safe props and events
- Composition builder components
- History timeline components
- Personal collection components
- Marketplace integration components
- Gallery view components
- Collection management components

### Services
- Wallet service for blockchain interaction
- State management services
- API integration services
- Utility services
- JPG.store service
- Composition management service
- Asset tracking service
- History management service
- Collection management service
- Gallery service

### State Management
- Centralized store for wallet state
- Reactive stores for UI state
- Persistent state handling
- Type-safe store implementations
- Composition state management
- Marketplace data state
- Personal collection state
- Timeline event state
- Gallery view state
- History tracking state

### Routes
- File-based routing
- API endpoints
- Dynamic routes for NFT pages
- Layout-based page organization
- History page routing
- Personal collection routes
- Composition builder routes
- Marketplace integration routes
- Gallery view routes
- Collection management routes

## Best Practices
- Type safety throughout
- Component composition
- Service abstraction
- State isolation
- Error boundary implementation
- Loading state management
- Mobile-first responsive design
- Marketplace data caching
- Composition state persistence
- Historical data management
- Performance optimization
- Testing coverage
- Documentation standards
- Accessibility compliance

Note: Ethereum-related patterns and architecture will be detailed in a future phase.

## Architecture Patterns

### Frontend Architecture
- Svelte 5 with runes for state management
- Component-based structure
- Responsive design patterns
- Lazy loading and prefetching
- Fixed navigation with proper z-indexing

### Wallet Integration (In Progress)
- Basic wallet connection UI
- Placeholder state management
- Service layer foundation
- Transaction handling (planned)
- Wallet state persistence (planned)

### Gallery System
- Square grid layout with dynamic sizing
- Height-based width calculation
- Sticky positioning with proper layering
- External navigation buttons
- Loading state management
- Image prefetching for adjacent pages

### State Management
- Runes for reactive state
- Centralized data flow
- Type-safe interactions
- Predictable state updates

### Navigation Patterns
- Fixed navbar
- Sticky gallery container
- External page controls
- Smooth transitions
- Proper z-index layering

### Loading Patterns
- Lazy loading for images
- Loading overlay with backdrop
- Prefetching for adjacent pages
- Error state handling
- Loading state indicators

### Filter System
- Multiple filter criteria
- Combinatorial filtering
- Filter state management
- Filter UI patterns
- Filter performance optimization

## Code Organization
- Component-based structure
- Type-safe interfaces
- Shared utilities
- Consistent styling patterns
- Reusable components

## Styling Patterns
- Tailwind for utility classes
- CSS variables for theming
- Responsive design principles
- Consistent spacing
- Proper z-index management

## Performance Patterns
- Image optimization
- Lazy loading
- Prefetching
- State caching
- Efficient filtering

## Error Handling
- Graceful degradation
- User feedback
- Error boundaries (planned)
- Loading states
- Retry mechanisms

## Gallery Architecture

### State Management
- Use Svelte 5 runes for reactivity
- $state for reactive variables
- $effect for side effects
- URL-based state persistence

### Component Structure
```
gallery/
  +page.svelte       # main gallery component
  $types.ts          # typescript types
```

### Data Flow
1. Initial load
   - Read URL params
   - Initialize state
   - Load initial page
   - Process metadata if available

2. Pagination
   - Update current page
   - Update URL
   - Load new images
   - Prefetch adjacent pages

3. Filtering
   - Update filter state
   - Apply filters
   - Update URL
   - Reload current page

4. Random mode
   - Generate random indexes
   - Load random images
   - Disable pagination
   - Provide exit mechanism

### Optimization Patterns
1. Image loading
   - Lazy load images
   - Prefetch adjacent pages
   - Size based on grid

2. State updates
   - Debounce search input
   - Batch state updates
   - Prevent unnecessary effects

3. URL management
   - Sync state with URL
   - Handle navigation
   - Preserve filters

### Error Handling
1. Loading states
   - Show loading overlay
   - Handle failed requests
   - Reset loading state

2. Validation
   - Check page bounds
   - Validate filter input
   - Sanitize search input

### Responsive Design
1. Grid layout
   - Dynamic grid size
   - Responsive image sizing
   - Maintain aspect ratio

2. Navigation
   - Touch-friendly controls
   - Keyboard navigation
   - Accessible buttons 