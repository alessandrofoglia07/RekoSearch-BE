import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UpdateDatasetEntriesCommand } from "@aws-sdk/client-rekognition";
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
            Key: { id: (image as ImageMetadata).userId },
            UpdateExpression: liked ? "SET likes = likes - :inc" : "SET likes = likes + :inc",
            ExpressionAttributeValues: { ":inc": { N: "1" } }
        }));

        const { Item: user } = await ddbDocClient.send(new GetCommand({
            TableName: process.env.USERS_TABLE_NAME,
            Key: { id: userId }
        }));

        if (user) {
            const newLikedImages = liked
                ? user.likedImages.filter((imageId: string) => imageId !== id)
                : [...user.likedImages, id];

            await ddbDocClient.send(new UpdateCommand({
                TableName: process.env.USERS_TABLE_NAME,
                Key: { id: userId },
                UpdateExpression: "SET likedImages = :likedImages",
                ExpressionAttributeValues: { ":likedImages": newLikedImages }
            }));
        }

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