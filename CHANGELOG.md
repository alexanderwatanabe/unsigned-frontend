# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-31

### Added
- Initial gallery implementation with grid layout
- Pagination controls with items per page selection
- ID search functionality with real-time filtering
- Random mode for viewing random selections
- Filter system supporting multiple property filters
- Image prefetching for adjacent pages
- Loading states and empty state handling
- Responsive grid sizing based on viewport
- Proper TypeScript types and interfaces

### Features
- Dynamic grid layout that adjusts to items per page
- Smooth image loading with lazy loading
- Hover effects showing NFT IDs
- Proper URL synchronization with state
- Smart image size selection based on grid size
- Prefetching of adjacent pages for smooth navigation
- Support for up to 6 concurrent filters
- Real-time ID search across all items
- Random mode with new set generation

### Technical
- Svelte 5 runes for state management
- TypeScript for type safety
- Proper effect handling and cleanup
- Efficient pagination implementation
- Smart prefetching system
- Modular component structure
- Consistent styling with CSS variables
- JetBrains Mono font integration
- Proper error handling and loading states

### UI/UX
- Clean, minimal design
- Consistent spacing and alignment
- Smooth transitions and hover effects
- Clear loading indicators
- Proper empty states
- Responsive controls
- Intuitive filter interface
- Clear pagination controls
- Proper disabled states for buttons 