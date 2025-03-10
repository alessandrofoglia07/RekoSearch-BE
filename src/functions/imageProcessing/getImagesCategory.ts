import { APIGatewayProxyEvent, Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { completeResponse, shortResponse } from "../../utils/responseTemplates";

const ddb = new DynamoDBClient({ region: process.env.SERVERLESS_AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddb);

export const handler: Handler = async (event: APIGatewayProxyEvent) => {
    try {
        const responseTemplate = event.queryStringParameters?.short === "true" ? shortResponse : completeResponse;

        const { category } = event.pathParameters ?? {};
        if (!category) {
            return {
                statusCode: 400,
                body: JSON.stringify("Category is required")
            };
        }

        const { Items } = await ddbDocClient.send(new QueryCommand({
            TableName: process.env.IMAGES_TABLE_NAME,
            IndexName: "category-uploadedAt-index",
            KeyConditionExpression: "category = :category",
            ExpressionAttributeValues: {
                ":category": category
            },
            ScanIndexForward: false,
            ProjectionExpression: responseTemplate
        }));

        return {
            statusCode: 200,
            body: JSON.stringify(Items)
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify(err)
        };
    }
};