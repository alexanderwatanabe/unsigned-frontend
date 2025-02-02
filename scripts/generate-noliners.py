import json
import os
from pathlib import Path

def is_no_liner(metadata):
    if not metadata or 'properties' not in metadata or 'multipliers' not in metadata['properties']:
        return False
        
    # Initialize sums for each color channel
    red_sum = 0
    green_sum = 0
    blue_sum = 0

    # For each property, add its multiplier to the corresponding color channel
    for color, multiplier in zip(metadata['properties']['colors'], metadata['properties']['multipliers']):
        multiplier = float(multiplier)
        
        if color == 'Red':
            red_sum += multiplier
        elif color == 'Green':
            green_sum += multiplier
        elif color == 'Blue':
            blue_sum += multiplier

    return red_sum <= 1 and green_sum <= 1 and blue_sum <= 1

def generate_no_liners():
    try:
        # Read the unsigs data file
        unsigs_path = Path(os.getcwd()) / 'src' / 'assets' / 'unsigs.json'
        with open(unsigs_path, 'r') as f:
            metadata = json.load(f)

        # Find all no-liner indices
        no_liner_indices = [
            int(id_) for id_, meta in metadata.items()
            if is_no_liner(meta)
        ]

        # Write the indices to a file
        noliners_path = Path(os.getcwd()) / 'src' / 'assets' / 'noliners.json'
        with open(noliners_path, 'w') as f:
            json.dump(no_liner_indices, f)

        print(f"Found {len(no_liner_indices)} no-liners")
    except Exception as error:
        print(f"Error generating no-liners: {error}")

if __name__ == '__main__':
    generate_no_liners()