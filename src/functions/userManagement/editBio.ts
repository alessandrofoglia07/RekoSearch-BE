import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Handler } from "aws-lambda";

const ddb = new DynamoDBClient({ region: process.env.SERVERLESS_AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddb);

export const handler: Handler = async (event) => {
    try {
        const { sub: userId } = event.requestContext.authorizer!.jwt.claims;
        const { bio } = JSON.parse(event.body);

        if (!bio) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Bio is required" }),
            };
        }

        // Update the user's bio
        const { Attributes } = await ddbDocClient.send(new UpdateCommand({
            TableName: process.env.USERS_TABLE_NAME,
            Key: { id: userId },
            UpdateExpression: "SET bio = :bio",
            ExpressionAttributeValues: { ":bio": bio },
            ReturnValues: "ALL_NEW",
        }));

        return {
            statusCode: 200,
            body: JSON.stringify(Attributes),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server error" }),
        };
    }
};