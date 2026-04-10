import { Response } from 'express';

export function apiResponse(res: Response, success: boolean, data: any, message?: string): Response {
    const response: any = {
        success,
        creator: "KayzzAoshi"
    };

    if (message) {
        response.message = message;
    }

    if (success) {
        response.data = data;
        response.copyCommand = generateCopyCommand(data);
    } else {
        response.error = data;
    }

    return res.json(response);
}

function generateCopyCommand(data: any): string {
    if (typeof data === 'string') {
        return `Copy text: "${data.substring(0, 50)}${data.length > 50 ? '...' : ''}"`;
    } else if (typeof data === 'object') {
        if (data.url) {
            return `Copy URL: ${data.url}`;
        } else if (data.image) {
            return `Copy image URL: ${data.image}`;
        } else if (data.video) {
            return `Copy video URL: ${data.video}`;
        } else if (data.result) {
            return `Copy result: "${JSON.stringify(data.result).substring(0, 50)}..."`;
        } else {
            return `Copy JSON: ${JSON.stringify(data).substring(0, 50)}...`;
        }
    }
    return 'Copy result';
}

export function errorResponse(res: Response, message: string, statusCode: number = 500): Response {
    return res.status(statusCode).json({
        success: false,
        creator: "KayzzAoshi",
        error: message
    });
}

export function successResponse(res: Response, data: any, message?: string): Response {
    return apiResponse(res, true, data, message);
}
