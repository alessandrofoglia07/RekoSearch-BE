import { APIGatewayProxyEvent, Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { shortResponse, completeResponse } from '../utils/responseTemplates';

const ddb = new DynamoDBClient({ region: process.env.SERVERLESS_AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddb);

export const handler: Handler = async (event: APIGatewayProxyEvent) => {
    try {
        const responseTemplate = event.queryStringParameters?.short === "true" ? shortResponse : completeResponse;

        const { label } = event.pathParameters ?? {};

        if (!label) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing label' })
            };
        }

        const { Items: labelImages } = await ddbDocClient.send(new QueryCommand({
            TableName: process.env.LABELS_TABLE_NAME,
            KeyConditionExpression: 'label = :label',
            ExpressionAttributeValues: {
                ':label': label
            },
        }));

        if (!labelImages) {
            return {
                statusCode: 200,
                body: JSON.stringify([])
            };
        }

        const images: ImageMetadata[] = [];

        for (const { imageId } of labelImages) {
            const { Item: image } = await ddbDocClient.send(new GetCommand({
                TableName: process.env.IMAGES_TABLE_NAME,
                Key: { id: imageId },
                ProjectionExpression: responseTemplate
            }));
            if (!image) continue;
            images.push(image as ImageMetadata);
        }

        return {
            statusCode: 200,
            body: JSON.stringify(images)
        };

    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify(err)
        };
    }
};