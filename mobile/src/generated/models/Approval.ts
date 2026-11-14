/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Change } from './Change';
export type Approval = {
    id: string;
    userId: string;
    name: string;
    change: Change;
    baseRevision: number | string;
    status?: string;
};

