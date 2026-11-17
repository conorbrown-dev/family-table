/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AcceptInviteRequest } from '../models/AcceptInviteRequest';
import type { CreateFamilyRequest } from '../models/CreateFamilyRequest';
import type { DecisionRequest } from '../models/DecisionRequest';
import type { FamilySummary } from '../models/FamilySummary';
import type { FamilyView } from '../models/FamilyView';
import type { InstacartLink } from '../models/InstacartLink';
import type { InviteRequest } from '../models/InviteRequest';
import type { JoinRequest } from '../models/JoinRequest';
import type { JoinResult } from '../models/JoinResult';
import type { Portion } from '../models/Portion';
import type { RoleRequest } from '../models/RoleRequest';
import type { WriteRequest } from '../models/WriteRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FamilyTableApiService {
    /**
     * @returns any OK
     * @throws ApiError
     */
    public static getHealth(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/health',
        });
    }
    /**
     * @returns FamilySummary OK
     * @throws ApiError
     */
    public static listFamilies(): CancelablePromise<Array<FamilySummary>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/families',
        });
    }
    /**
     * @param requestBody
     * @returns FamilyView OK
     * @throws ApiError
     */
    public static createFamily(
        requestBody: CreateFamilyRequest,
    ): CancelablePromise<FamilyView> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/families',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @returns FamilyView OK
     * @throws ApiError
     */
    public static getFamily(
        id: string,
    ): CancelablePromise<FamilyView> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/families/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param id
     * @param requestBody
     * @returns FamilyView OK
     * @throws ApiError
     */
    public static saveChange(
        id: string,
        requestBody: WriteRequest,
    ): CancelablePromise<FamilyView> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/families/{id}/changes',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @param approvalId
     * @param requestBody
     * @returns FamilyView OK
     * @throws ApiError
     */
    public static decideApproval(
        id: string,
        approvalId: string,
        requestBody: DecisionRequest,
    ): CancelablePromise<FamilyView> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/families/{id}/approvals/{approvalId}',
            path: {
                'id': id,
                'approvalId': approvalId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param requestBody
     * @returns JoinResult OK
     * @throws ApiError
     */
    public static joinFamily(
        requestBody: JoinRequest,
    ): CancelablePromise<JoinResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/join',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @param requestBody
     * @returns JoinResult OK
     * @throws ApiError
     */
    public static inviteMember(
        id: string,
        requestBody: InviteRequest,
    ): CancelablePromise<JoinResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/families/{id}/invites',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param requestBody
     * @returns FamilyView OK
     * @throws ApiError
     */
    public static acceptInvite(
        requestBody: AcceptInviteRequest,
    ): CancelablePromise<FamilyView> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/accept-invite',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @param userId
     * @param requestBody
     * @returns FamilyView OK
     * @throws ApiError
     */
    public static setMemberRole(
        id: string,
        userId: string,
        requestBody: RoleRequest,
    ): CancelablePromise<FamilyView> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/families/{id}/members/{userId}/role',
            path: {
                'id': id,
                'userId': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id
     * @returns FamilyView OK
     * @throws ApiError
     */
    public static rotateJoinCode(
        id: string,
    ): CancelablePromise<FamilyView> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/families/{id}/rotate-code',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param id
     * @param planId
     * @returns Portion OK
     * @throws ApiError
     */
    public static getNeededIngredients(
        id: string,
        planId: string,
    ): CancelablePromise<Array<Portion>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/families/{id}/plans/{planId}/needed',
            path: {
                'id': id,
                'planId': planId,
            },
        });
    }
    /**
     * @param id
     * @param listId
     * @returns InstacartLink OK
     * @throws ApiError
     */
    public static orderOnInstacart(
        id: string,
        listId: string,
    ): CancelablePromise<InstacartLink> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/families/{id}/groceries/{listId}/instacart',
            path: {
                'id': id,
                'listId': listId,
            },
        });
    }
}
