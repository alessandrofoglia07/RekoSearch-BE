import { AdminGetUserCommand, CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, Handler } from "aws-lambda";

const ddb = new DynamoDBClient({ region: process.env.SERVERLESS_AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddb);
const cognito = new CognitoIdentityProviderClient({ region: process.env.SERVERLESS_AWS_REGION });

export const handler: Handler = async (event: APIGatewayProxyEvent) => {
    try {
        const { id_or_username } = event.pathParameters ?? {};
        const queryType = event.queryStringParameters?.queryType ?? "id";

        if (queryType !== "id" && queryType !== "username") {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Bad Request" }),
            };
        } else if (!id_or_username) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Bad Request" }),
            };
        }

        let id: string;
        if (queryType === 'username') {
            const user = await cognito.send(new AdminGetUserCommand({
                UserPoolId: process.env.COGNITO_USER_POOL,
                Username: id_or_username
            }));
            const sub = (user.UserAttributes ?? []).find(attr => attr.Name === "sub")?.Value;
            sub ? id = sub : id = id_or_username;
        } else {
            id = id_or_username;
        }

        const { Item: user } = await ddbDocClient.send(new GetCommand({
            TableName: process.env.USERS_TABLE_NAME,
            Key: { id },
            ProjectionExpression: 'userId, username, email, profilePictureUrl, bio, followers, following, views, likes'
        }));


        if (!user) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "User not found" }),
            };
        }

        user.followers = user.followers.length;
        user.following = user.following.length;

        return {
            statusCode: 200,
            body: JSON.stringify(user),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error" }),
        };
    }
};