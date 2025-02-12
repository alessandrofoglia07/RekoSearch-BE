import { APIGatewayProxyEvent, Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { CognitoIdentityProviderClient, AdminGetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const ddb = new DynamoDBClient({ region: process.env.SERVERLESS_AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddb);
const cognito = new CognitoIdentityProviderClient({ region: process.env.SERVERLESS_AWS_REGION });

export const handler: Handler = async (event: APIGatewayProxyEvent) => {
    try {
        const { username } = event.pathParameters ?? {};
        if (!username) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing username" }),
            };
        }

        const user = await cognito.send(new AdminGetUserCommand({
            UserPoolId: process.env.COGNITO_USER_POOL,
            Username: username
        }));
        const sub = (user.UserAttributes ?? []).find(attr => attr.Name === "sub")?.Value;
        if (!sub) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "User not found" }),
            };
        }

        const { Items } = await ddbDocClient.send(new QueryCommand({
            TableName: process.env.IMAGES_TABLE_NAME,
            IndexName: 'userId-imageId-index',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': sub
            }
        }));

        return {
            statusCode: 200,
            body: JSON.stringify(Items),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error" }),
        };
    }
};