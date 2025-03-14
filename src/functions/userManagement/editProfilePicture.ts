import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Handler } from "aws-lambda";
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3Client({ region: process.env.SERVERLESS_AWS_REGION });

export const handler: Handler = async (event) => {
    try {
        const { userId } = event.requestContext.authorizer!.jwt.claims;
        const { fileType } = JSON.parse(event.body ?? "{}");

        if (!fileType) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Missing fileName or fileType"
                })
            };
        }

        const imageId = uuidv4() + "-" + userId;

        const command = new PutObjectCommand({
            Bucket: process.env.IMAGES_BUCKET_NAME,
            Key: `profile-pictures/${imageId}`,
            ContentType: fileType
        });

        const url = await getSignedUrl(s3, command, { expiresIn: 300 });

        return {
            statusCode: 200,
            body: JSON.stringify({ uploadUrl: url, imageId })
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal server error"
            })
        };
    };
};