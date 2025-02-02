# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2024-03-21

### Added
- ESC key shortcut to close drawer
- Prioritized keyboard shortcut handling

### Changed
- Updated keyboard event handling pattern
- Improved drawer close behavior

## [0.4.0] - 2024-03-21

### Added
- New monochrome collection view with pagination
- Keyboard shortcut 'm' for monochrome view
- Subcollections section in drawer
- Consistent button styling for special collections

### Changed
- Reorganized drawer controls for better UX
- Moved special collections to bottom of drawer
- Simplified button text across collections
- Improved layout with two-row design for subcollections
- Random button now appears below other collections

### Removed
- Separate random section
- "show" prefix from collection button text
- Exit random mode button (now handled by view transitions)

## [Unreleased]
### Added
- Arrow key navigation for pagination (←/→)
- 'e' keyboard shortcut to toggle extras drawer
- Visual indicators for keyboard shortcuts (n, r, e)
- Intermittent rainbow effect for shortcut indicators
- Close button (×) for drawer
- Vertical alignment improvements for controls

### Changed
- Replaced +/- with ←/→ for pagination controls
- Improved input sizing for page number and search
- Enhanced drawer close button visibility
- Updated filter behavior across mode transitions

### Fixed
- Filter application after mode changes
- Removed unused CSS selectors
- Vertical alignment of pagination controls
- Drawer close button positioning

### Security
- Added safe event handling for keyboard shortcuts

## [0.3.0] - 2024-03-20

### Added
- No-liner view mode with pagination
- Random mode with batch refresh
- Keyboard shortcuts (r, n) for mode switching
- Dynamic image resolution based on view
- Prefetching for adjacent pages

### Changed
- Optimized image loading strategy
- Improved state management with Svelte 5 runes
- Enhanced filter table interface
- Updated grid sizing calculations

### Fixed
- Circular dependencies in state management
- Pagination issues in special views
- Filter application edge cases
- Image loading performance

## [0.1.0] - 2024-03-18

### Added
- Initial gallery implementation
- Grid layout with dynamic sizing
- Basic pagination controls
- Filter system with multiple categories
- Search by NFT ID
- Responsive drawer interface
- Image resolution switching
- Hover effects for NFT display

### Changed
- Switched to Svelte 5 runes for state management
- Implemented dynamic page size adjustment
- Added lazy loading for images

### Security
- CORS compliance for image loading
- XSS prevention in search and filters

## [Unreleased] - Animation Optimization
### Added
- Row/column-based animation processing
- 1D buffer system for efficient memory usage
- willReadFrequently canvas context attribute
- New animation branch for development

### Changed
- Reduced animation resolution to 1024x1024
- Refactored PropertyBuffer to use 1D arrays
- Updated animation processing for better performance
- Modified frame generation system

### Optimized
- Memory usage in animation system
- Frame processing efficiency
- Canvas rendering performance
- Buffer management system

## [0.2.0] - 2024-02-02
### Added
- Animation system with frame capture
- Video export functionality
- Layer toggling system
- Download options for different resolutions

### Changed
- Updated canvas handling
- Improved state management
- Enhanced error handling
- Refined UI components

### Fixed
- Memory leaks in animation
- Canvas scaling issues
- Frame rate inconsistencies
- State management bugs

## [0.1.0] - 2024-02-01
### Added
- Initial NFT viewer implementation
- Basic animation support
- Property table display
- Fullscreen mode

### Changed
- Improved image generation
- Updated distribution calculations
- Enhanced UI responsiveness
- Refined code structure

### Fixed
- Distribution calculation errors
- Image scaling issues
- Performance bottlenecks
- UI inconsistencies 