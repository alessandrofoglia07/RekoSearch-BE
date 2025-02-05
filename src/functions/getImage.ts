import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddb = new DynamoDBClient({ region: process.env.SERVERLESS_AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddb);

export const handler = async (event) => {
    try {
        const { id } = event.pathParameters;

        const { Item } = await ddbDocClient.send(new GetCommand({
            TableName: process.env.IMAGES_TABLE_NAME,
            Key: { id }
        }));

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