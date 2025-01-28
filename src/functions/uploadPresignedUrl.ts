import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APIGatewayProxyEvent, Handler } from "aws-lambda";
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3Client({ region: process.env.SERVERLESS_AWS_REGION });
const ddb = new DynamoDBClient({ region: process.env.SERVERLESS_AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddb);

export const handler: Handler = async (event: APIGatewayProxyEvent) => {
    try {
        const { username, sub: userId } = event.requestContext.authorizer!.jwt.claims;
        const { fileName, fileType, imageTitle, imageDescription } = JSON.parse(event.body ?? "{}");
        if (!fileName || !fileType) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing fileName or fileType" }),
            };
        }

        const imageId = uuidv4() + "-" + fileName;

        const command = new PutObjectCommand({
            Bucket: process.env.IMAGES_BUCKET_NAME,
            Key: `uploads/${imageId}`,
            ContentType: fileType
        });

        const imageMetadata: ImageMetadata = {
            userId,
            authorUsername: username,
            imageTitle,
            imageDescription,
            imageId,
            uploadedAt: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
            ttl: Math.floor(Date.now() / 1000) + 300 // 5 minutes from now
        };

        // Save the image metadata to DynamoDB (with 5 minutes TTL)
        await docClient.send(new PutCommand({
            TableName: process.env.IMAGES_TABLE_NAME,
            Item: imageMetadata
        }));

        // Generate a pre-signed URL for the S3 PUT operation (5 minutes)
        const url = await getSignedUrl(s3, command, { expiresIn: 300 });

        return {
            statusCode: 200,
            body: JSON.stringify({ uploadUrl: url, imageId }),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error" }),
        };
    }
};