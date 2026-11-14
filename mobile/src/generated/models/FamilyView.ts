/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Approval } from './Approval';
import type { GroceryList } from './GroceryList';
import type { Ingredient } from './Ingredient';
import type { MealPlan } from './MealPlan';
import type { Person } from './Person';
import type { Recipe } from './Recipe';
export type FamilyView = {
    id: string;
    name: string;
    joinCode: string | null;
    revision: number | string;
    people: Array<Person>;
    ingredients: Array<Ingredient>;
    recipes: Array<Recipe>;
    groceryLists: Array<GroceryList>;
    mealPlans: Array<MealPlan>;
    approvals: Array<Approval>;
    units: Array<string>;
};

