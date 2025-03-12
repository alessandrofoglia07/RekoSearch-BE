import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, Handler } from "aws-lambda";

const ddb = new DynamoDBClient({ region: process.env.SERVERLESS_AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddb);

export const handler: Handler = async (event: APIGatewayProxyEvent) => {
    try {
        const { id } = event.pathParameters ?? {};
        const { sub: userId } = event.requestContext.authorizer!.jwt.claims;

        const { Item: userToFollow } = await ddbDocClient.send(new GetCommand({
            TableName: process.env.USERS_TABLE_NAME,
            Key: { id }
        }));
        const { Item: user } = await ddbDocClient.send(new GetCommand({
            TableName: process.env.USERS_TABLE_NAME,
            Key: { id: userId }
        }));

        if (!user || !userToFollow) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "User not found" }),
            };
        }

        const { followers } = userToFollow as UserData;
        const followed = followers.includes(userId);

        const updatedFollowers = followed
            ? followers.filter((follower) => follower !== userId)
            : [...followers, userId];

        await ddbDocClient.send(new UpdateCommand({
            TableName: process.env.USERS_TABLE_NAME,
            Key: { id },
            UpdateExpression: "SET followers = :followers",
            ExpressionAttributeValues: { ":followers": updatedFollowers },
        }));

        const { following } = user as UserData;
        const updatedFollowing = followed
            ? following.filter((followedUser) => followedUser !== id)
            : [...following, id];

        await ddbDocClient.send(new UpdateCommand({
            TableName: process.env.USERS_TABLE_NAME,
            Key: { id: userId },
            UpdateExpression: "SET following = :following",
            ExpressionAttributeValues: { ":following": updatedFollowing },
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Success" }),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error" }),
        };
    }
};