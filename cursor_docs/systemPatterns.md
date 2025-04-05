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
   - ESC - Close drawer (prioritized)
   - 'm' - Show monochromes
   - 'n' - Show no-liners
   - 'r' - Toggle random view
   - ←/→ - Navigate pages

6. Event Handling Patterns:
   - Early return for input field focus
   - Prioritized ESC handling
   - Mode-specific key handling
   - Consistent shortcut system

### My Unsigs Page
1. Core Components:
   - Grid display for owned NFTs
   - Pagination controls
   - CompositionBuilder modal
   - Wallet integration

2. Navigation Patterns:
   - Modal-based composition creation
   - Conditional UI elements
   - Clear user flow
   - Seamless mode handling

3. State Management:
   - Wallet connection state
   - Asset loading state
   - Grid display state
   - Modal states

### UnsigSelector Component
1. Core Features:
   - Dropdown-based selection interface
   - Preview of selected unsig
   - Grid display of available unsigs
   - Index display on hover
   - Backdrop for closing dropdown

2. State Management:
   - Selected unsig state
   - Dropdown visibility state
   - Props for external control
   - Event handling for selection

3. UI Patterns:
   - Consistent grid layout
   - Hover effects for indices
   - Transition animations
   - Clear visual hierarchy

4. Interaction Model:
   - Click to open dropdown
   - Click outside to close
   - Click unsig to select
   - Preview shows current selection

### CompositionBuilder Component
1. Core Features:
   - Dynamic grid layout
   - Individual cell selectors
   - Row/column addition
   - Transaction building (owned mode)

2. State Management:
   - Grid dimensions
   - Cell contents
   - Modal states
   - Selection state

3. Grid Pattern:
   - Dynamic m x n sizing
   - Cell-based interaction
   - Clear cell functionality
   - Visual feedback on hover

4. Transaction Pattern:
   - Single UTxO output
   - Grid metadata structure
   - Default to wallet address
   - Error handling

### Composition Mode
1. Layout Structure:
   - Left drawer for unsig selection
   - Centered grid workspace
   - Top toolbar for actions
   - Bottom toolbar for transaction

2. Drawer Component:
   - Grid display of owned unsigs
   - Search/filter functionality
   - Drag source capabilities
   - Collapsible interface

3. Grid Workspace:
   - Dynamic grid sizing
   - Drop target zones
   - Rotation controls
   - Cell interactions

4. State Management:
   - Grid state with positions and rotations
   - Drawer visibility state
   - Drag and drop state
   - Undo/redo history

5. Interaction Patterns:
   - Drag from drawer to grid
   - Drag between grid cells
   - Cell rotation controls
   - Keyboard shortcuts
   - Touch gestures

6. Transaction Flow:
   - Grid validation
   - Metadata construction
   - Transaction building
   - Success/error handling

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

## Wallet Integration
1. State Management:
   - BrowserWalletState for wallet status
   - Reactive connection state
   - Address management
   - Asset tracking

2. Error Handling:
   - Connection errors
   - Transaction errors
   - Asset loading errors
   - Type-safe error messages

3. Transaction Building:
   - Single UTxO output
   - Grid metadata
   - Asset collection
   - Error handling

4. Asset Management:
   - Policy ID filtering
   - Asset unit parsing
   - Index extraction
   - Quantity tracking

## Image Handling
- Resolution tiers:
  - 1024px for single view
  - 256px for 4-16 grid
  - 128px for larger grids
- Prefetching for adjacent pages
- Dynamic URL construction with padded indices

## UI Patterns
- Lowercase text throughout
- JetBrains Mono font
- Keyboard navigation
- Grid-based layouts
- Loading states and error handling
- Responsive design

## State Management
- Reactive wallet connection state
- Asset loading states
- Pagination state
- Grid size management

## Composition Patterns
1. Grid State:
   - Position-based layout
   - Null positions allowed
   - Metadata tracking
   - Transaction preparation

2. Selection Flow:
   - Cell selection
   - Unsig picker
   - Position assignment
   - Clear functionality

3. Transaction Flow:
   - Asset collection
   - Metadata building
   - Single UTxO output
   - Error handling

4. UI Feedback:
   - Loading states
   - Error messages
   - Success indicators
   - Visual transitions

## Navigation Patterns
1. Page Links:
   - Context-aware navigation
   - Mode parameter passing
   - Clear user flow
   - Conditional elements

2. State Preservation:
   - URL parameters
   - Mode persistence
   - Grid state management
   - Transaction state

3. User Flow:
   - Intuitive progression
   - Clear entry points
   - Consistent patterns
   - Visual feedback

Note: This documentation will be expanded as more patterns emerge during development. 