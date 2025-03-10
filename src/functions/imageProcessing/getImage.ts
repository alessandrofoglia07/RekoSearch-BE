import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, Handler } from "aws-lambda";
import { completeResponse, shortResponse } from "../../utils/responseTemplates";

const ddb = new DynamoDBClient({ region: process.env.SERVERLESS_AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddb);

export const handler: Handler = async (event: APIGatewayProxyEvent) => {
    try {
        const responseTemplate = event.queryStringParameters?.short === "true" ? shortResponse : completeResponse;

        const { id } = event.pathParameters ?? {};

        // Update the views count
        const { Attributes } = await ddbDocClient.send(new UpdateCommand({
            TableName: process.env.IMAGES_TABLE_NAME,
            Key: { id },
            UpdateExpression: "SET views = views + :inc",
            ExpressionAttributeValues: { ":inc": { N: "1" } },
            ReturnValues: "ALL_NEW",
        }));

        await ddbDocClient.send(new UpdateCommand({
            TableName: process.env.USERS_TABLE_NAME,
            Key: { id },
            UpdateExpression: "SET views = views + :inc",
            ExpressionAttributeValues: { ":inc": { N: "1" } }
        }));

        const Item = responseTemplate === shortResponse ? {
            id: Attributes?.id,
            fileUrl: Attributes?.fileUrl,
            imageTitle: Attributes?.imageTitle,
            category: Attributes?.category,
            labels: Attributes?.labels,
            views: Attributes?.views,
            likes: Attributes?.likes,
            authorUsername: Attributes?.authorUsername,
        } : Attributes;

        return {
            statusCode: 200,
            body: JSON.stringify(Item)
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify(err)
        };
    }
};