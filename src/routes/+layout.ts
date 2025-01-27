// Add type safety for the data
export type Unsig = {
    index: number;
    num_props: number;
    properties: {
        multipliers: number[];
        colors: string[];
        distributions: string[];
        rotations: number[];
    };
};

export type UnsigData = {
    [key: string]: Unsig;
}; 