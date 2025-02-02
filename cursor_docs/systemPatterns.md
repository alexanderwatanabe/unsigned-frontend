# System Patterns

## Component Architecture

### Gallery Page
1. Core Components:
   - Grid display for NFTs
   - Drawer for controls
   - Pagination system

2. State Management:
   - Uses Svelte 5 runes for reactivity
   - Centralized view state (`currentView`)
   - Separate states for different modes

3. View Types:
   - 'all' (default grid view)
   - 'random' (random selection)
   - 'noliners' (special collection)
   - 'monochromes' (special collection)

4. Subcollections Pattern:
   - Located at bottom of drawer
   - Consistent button styling
   - Two-row layout:
     * Top row: Special collections (monochromes, no-liners)
     * Bottom row: Utility views (random)
   - Each subcollection maintains its own:
     * Data source (JSON file)
     * View state
     * Pagination
     * Keyboard shortcut

5. Keyboard Navigation:
   - 'e' - Toggle extras drawer
   - 'm' - Show monochromes
   - 'n' - Show no-liners
   - 'r' - Toggle random view
   - ←/→ - Navigate pages

## Architecture
1. Frontend Framework:
   - SvelteKit for server-side rendering and routing
   - Svelte 5 with runes for state management
   - TypeScript for type safety

2. State Management:
   - Using Svelte 5 runes ($state, $derived)
   - View modes: 'all', 'random', 'noliners'
   - Pagination state with currentPage and itemsPerPage
   - Filter state with pending and active filters

3. User Interaction:
   - Keyboard shortcuts with visual indicators
   - Arrow key navigation for pagination
   - Drawer-based controls with keyboard toggle
   - Mode-specific behaviors

4. Data Flow:
   - Metadata loaded on mount
   - Pre-calculated data (like no-liners) stored in assets
   - Dynamic image loading based on view context
   - Prefetching for adjacent pages

## Key Technical Decisions
1. Image Resolution Strategy:
   - Different sizes based on items per page
   - Balances quality vs performance
   - Prefetching for smooth navigation

2. State Management:
   - Svelte 5 runes for reactive state
   - Derived values for computed properties
   - Effects for side effects and updates
   - Clear state transitions between modes

3. UI/UX Patterns:
   - Consistent keyboard shortcuts
   - Visual feedback for interactions
   - Responsive drawer interface
   - Intermittent animations for discoverability

## Design Patterns
1. Component Structure:
   - Single page component for gallery
   - Drawer for controls and filters
   - Grid layout for NFT display
   - Modular state management

2. State Updates:
   - Reactive updates through Svelte runes
   - Clear state transitions between views
   - Controlled side effects
   - Mode-specific behaviors

3. User Interaction:
   - Keyboard-first navigation
   - Visual feedback for all actions
   - Progressive loading and prefetching
   - Consistent shortcut system

## Code Organization
1. State Management:
   - View state (currentView, randomMode)
   - Pagination state (currentPage, itemsPerPage)
   - Filter state (activeFilters, pendingFilters)
   - UI state (isDrawerOpen, isLoading)

2. Event Handling:
   - Keyboard shortcuts
   - Mode transitions
   - Pagination controls
   - Filter application

3. Visual Feedback:
   - Loading states
   - Animations
   - Hover effects
   - Keyboard shortcut indicators

## Component Structure
- Gallery page as main container
- Drawer component for filters and controls
- Grid component for NFT display
- Filter table with integrated controls
- Pagination controls with dynamic sizing

## State Management
- Runes-based reactive state
- Derived values for computed properties
- Effect-based side effects handling
- Client-side filter application
- Optimistic UI updates

## Performance Patterns
1. Image prefetching for adjacent pages
2. Lazy loading for grid images
3. Debounced search and filter updates
4. Efficient grid resizing
5. Optimized filter application logic
6. Smart pagination size adjustment

## Design Patterns
- Component-based UI architecture
- Route-based page organization
- Type-safe development practices
- API-first approach for data handling

Note: This documentation will be expanded as more patterns emerge during development. 