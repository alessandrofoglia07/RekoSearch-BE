import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Handler, S3CreateEvent } from "aws-lambda";

const ddb = new DynamoDBClient({ region: process.env.SERVERLESS_AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddb);

export const handler: Handler = async (event: S3CreateEvent) => {
    try {
        const record = event.Records[0]!;
        const bucket = record.s3.bucket.name;
        const fileKey = record.s3.object.key;

        const imageId = fileKey.split("/")[1];
        if (!imageId) {
            return console.error("Invalid fileKey");
        }

        await ddbDocClient.send(new UpdateCommand({
            TableName: process.env.USERS_TABLE_NAME,
            Key: { userId: imageId.split("-")[1] },
            UpdateExpression: "SET profilePicture = :profilePicture",
            ExpressionAttributeValues: {
                ":profilePicture": `https://${bucket}.s3.amazonaws.com/${fileKey}`
            }
        }));

        return console.log("Profile picture updated");
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal server error"
            })
        };
    }
};