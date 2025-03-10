import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, Handler } from "aws-lambda";

const ddb = new DynamoDBClient({ region: process.env.SERVERLESS_AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddb);

export const handler: Handler = async (event: APIGatewayProxyEvent) => {
    try {
        const { id } = event.pathParameters ?? {};
        const { sub: userId } = event.requestContext.authorizer!.jwt.claims;

        const { Item: image } = await ddbDocClient.send(new GetCommand({
            TableName: process.env.IMAGES_TABLE_NAME,
            Key: { id }
        }));

        if (!image) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "Image not found" }),
            };
        }

        const { likes } = image as ImageMetadata;
        const liked = likes.includes(userId);

        const updatedLikes = liked
            ? likes.filter((like) => like !== userId)
            : [...likes, userId];

        await ddbDocClient.send(new UpdateCommand({
            TableName: process.env.IMAGES_TABLE_NAME,
            Key: { id },
            UpdateExpression: "SET likes = :likes",
            ExpressionAttributeValues: { ":likes": updatedLikes },
        }));

        await ddbDocClient.send(new UpdateCommand({
            TableName: process.env.USERS_TABLE_NAME,
            Key: { id },
            UpdateExpression: liked ? "SET likes = likes - :inc" : "SET likes = likes + :inc",
            ExpressionAttributeValues: { ":inc": { N: "1" } }
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ ...image, likes: updatedLikes }),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error" }),
        };
    }
};