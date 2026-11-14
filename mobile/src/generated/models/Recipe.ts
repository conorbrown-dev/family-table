/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Portion } from './Portion';
export type Recipe = {
    id: string;
    name: string;
    description: string;
    minutes: number | string;
    servings: number | string;
    ingredients: Array<Portion>;
    instructions: Array<string>;
    ratings: Record<string, number | string>;
    archived?: boolean;
};

