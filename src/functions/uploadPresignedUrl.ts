import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Handler } from "aws-lambda";
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3Client({ region: process.env.SERVERLESS_AWS_REGION });

export const handler: Handler = async (event) => {
    try {
        const { fileName, fileType } = JSON.parse(event.body);
        if (!fileName || !fileType) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing fileName or fileType" }),
            };
        }

        const fileKey = `uploads/${uuidv4()}-${fileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.IMAGES_BUCKET_NAME,
            Key: fileKey,
            ContentType: fileType
        });

        const url = await getSignedUrl(s3, command, { expiresIn: 300 });

        return {
            statusCode: 200,
            body: JSON.stringify({ uploadUrl: url, imageKey: fileKey }),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error" }),
        };
    }
};