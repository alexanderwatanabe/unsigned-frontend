"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRotation = parseRotation;
exports.parseMultiplier = parseMultiplier;
exports.convertRawMetadata = convertRawMetadata;
function parseRotation(rotation) {
    return parseInt(rotation, 10);
}
function parseMultiplier(multiplier) {
    return parseFloat(multiplier);
}
function convertRawMetadata(raw) {
    return {
        id: raw.id,
        properties: {
            colors: raw.properties.colors,
            distributions: raw.properties.distributions,
            rotations: raw.properties.rotations.map(parseRotation),
            multipliers: raw.properties.multipliers.map(parseMultiplier)
        }
    };
}
