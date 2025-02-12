import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteFacesCommand, RekognitionClient } from "@aws-sdk/client-rekognition";
import { S3Client, DeleteObjectCommand, waitUntilObjectNotExists } from "@aws-sdk/client-s3";
import { DeleteCommand, DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, Handler } from "aws-lambda";

const ddb = new DynamoDBClient({ region: process.env.SERVERLESS_AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddb);
const s3 = new S3Client({ region: process.env.SERVERLESS_AWS_REGION });
const rekognition = new RekognitionClient({ region: process.env.SERVERLESS_AWS_REGION });

export const handler: Handler = async (event: APIGatewayProxyEvent) => {
    try {
        const { id } = event.pathParameters ?? {};
        const { sub: userId } = event.requestContext.authorizer!.jwt.claims;

        // Get image metadata from DynamoDB
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

        const { userId: owner } = image as ImageMetadata;
        if (userId !== owner) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: "Forbidden" }),
            };
        }
        const fileKey = (image as ImageMetadata).fileUrl?.split('/').pop();

        // Delete image file from S3
        await s3.send(new DeleteObjectCommand({
            Bucket: process.env.IMAGES_BUCKET_NAME,
            Key: fileKey
        }));

        // Delete image metadata from DynamoDB
        await ddbDocClient.send(new DeleteCommand({
            TableName: process.env.IMAGES_TABLE_NAME,
            Key: { id }
        }));

        // Delete image labels from DynamoDB
        for (const label of (image as ImageMetadata).labels) {
            await ddbDocClient.send(new DeleteCommand({
                TableName: process.env.LABELS_TABLE_NAME,
                Key: { label, imageId: id }
            }));
        }

        // Delete image from Rekognition collection
        if ((image as ImageMetadata).rekognitionId) {
            await rekognition.send(new DeleteFacesCommand({
                CollectionId: process.env.REKOGNITION_COLLECTION_ID,
                FaceIds: [image.rekognitionId]
            }));
        }

        // Wait until the image file is deleted from S3
        await waitUntilObjectNotExists({ client: s3, maxWaitTime: 30 }, { Bucket: process.env.IMAGES_BUCKET_NAME, Key: fileKey });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Image deleted successfully" }),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error" }),
        };
    }
};