"use strict";
const fs = require('fs');
const path = require('path');
const { convertRawMetadata } = require('../src/lib/types');
function isNoLiner(metadata) {
    if (!metadata?.properties?.multipliers)
        return false;
    // Group multipliers by color channel (every 3rd value)
    const redMultipliers = metadata.properties.multipliers.filter((_, i) => i % 3 === 0);
    const greenMultipliers = metadata.properties.multipliers.filter((_, i) => i % 3 === 1);
    const blueMultipliers = metadata.properties.multipliers.filter((_, i) => i % 3 === 2);
    // Check if sum of ALL channels' multipliers is less than 1
    const redSum = redMultipliers.reduce((sum, val) => sum + Number(val), 0);
    const greenSum = greenMultipliers.reduce((sum, val) => sum + Number(val), 0);
    const blueSum = blueMultipliers.reduce((sum, val) => sum + Number(val), 0);
    return redSum < 1 && greenSum < 1 && blueSum < 1;
}
async function generateNoLiners() {
    try {
        // Read the metadata file
        const metadata = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'static', 'metadata.json'), 'utf-8'));
        // Find all no-liner indices
        const noLinerIndices = metadata
            .map((meta, index) => ({ meta, index }))
            .filter(({ meta }) => isNoLiner(meta))
            .map(({ index }) => index);
        // Write the indices to a file
        fs.writeFileSync(path.join(process.cwd(), 'static', 'noliners.json'), JSON.stringify(noLinerIndices));
        console.log(`Found ${noLinerIndices.length} no-liners`);
    }
    catch (error) {
        console.error('Error generating no-liners:', error);
    }
}
generateNoLiners();
