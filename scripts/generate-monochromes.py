import json
import os
from pathlib import Path

def print_unsig_properties(metadata, unsig_id):
    if not metadata or 'properties' not in metadata:
        return
        
    props = metadata['properties']
    print(f"\nAnalyzing Unsig #{unsig_id}:")
    print("Colors:", props.get('colors', []))
    print("Distributions:", props.get('distributions', []))
    print("Multipliers:", props.get('multipliers', []))
    print("Rotations:", props.get('rotations', []))

def check_property_group_consistency(properties, group_size):
    """Check if properties are consistent within groups of size group_size"""
    if len(properties) % group_size != 0:
        return False
        
    num_groups = len(properties) // group_size
    for i in range(num_groups):
        group = properties[i*group_size:(i+1)*group_size]
        if len(set(group)) != 1:  # All values in group must be same
            return False
    return True

def is_valid_color_pattern(colors, pattern):
    """Check if colors follow a repeating pattern (e.g. ['Red', 'Green'] for RG doublets)"""
    if len(colors) % len(pattern) != 0:
        return False
    return all(colors[i:i+len(pattern)] == pattern 
              for i in range(0, len(colors), len(pattern)))

def is_monochrome(metadata):
    if not metadata or 'properties' not in metadata:
        return False
        
    props = metadata['properties']
    distributions = props.get('distributions', [])
    multipliers = props.get('multipliers', [])
    rotations = props.get('rotations', [])
    colors = props.get('colors', [])
    
    if not distributions or not multipliers or not rotations or not colors:
        return False
    
    # Check if all distributions are the same
    if len(set(distributions)) != 1:
        return False
    
    # Original criteria: all properties match first layer
    all_same = (len(set(multipliers)) == 1 and 
                len(set(rotations)) == 1)
    
    if all_same:
        return True
    
    # Define possible color patterns
    color_patterns = [
        ['Red', 'Green', 'Blue'],  # RGB triplets
        ['Red', 'Green'],          # RG doublets
        ['Red', 'Blue'],           # RB doublets
        ['Green', 'Blue']          # GB doublets
    ]
    
    # Check each pattern
    for pattern in color_patterns:
        pattern_size = len(pattern)
        if (is_valid_color_pattern(colors, pattern) and
            check_property_group_consistency(multipliers, pattern_size) and
            check_property_group_consistency(rotations, pattern_size)):
            return True
    
    return False

def generate_monochromes():
    try:
        # Read the unsigs data file
        unsigs_path = Path(os.getcwd()) / 'src' / 'assets' / 'unsigs.json'
        with open(unsigs_path, 'r') as f:
            metadata = json.load(f)

        # Analyze specific unsig
        target_unsig = "27754"
        if target_unsig in metadata:
            print_unsig_properties(metadata[target_unsig], target_unsig)

        # Find all monochrome indices
        monochrome_indices = [
            int(id_) for id_, meta in metadata.items()
            if is_monochrome(meta)
        ]

        # Sort indices for better readability
        monochrome_indices.sort()

        # Write the indices to a file
        monochromes_path = Path(os.getcwd()) / 'src' / 'assets' / 'monochromes.json'
        with open(monochromes_path, 'w') as f:
            json.dump(monochrome_indices, f)

        print(f"\nFound {len(monochrome_indices)} monochromes")
    except Exception as error:
        print(f"Error generating monochromes: {error}")

if __name__ == '__main__':
    generate_monochromes() 