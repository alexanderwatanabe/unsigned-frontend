# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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