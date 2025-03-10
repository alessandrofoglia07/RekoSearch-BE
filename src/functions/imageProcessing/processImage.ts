import { Handler, S3CreateEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, BatchWriteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DetectLabelsCommand, IndexFacesCommand, RekognitionClient } from '@aws-sdk/client-rekognition';
import { CATEGORY_MAPPING } from "../../utils/categoryMapping";

const ddb = new DynamoDBClient({ region: process.env.SERVERLESS_AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddb);
const rekognition = new RekognitionClient({ region: process.env.SERVERLESS_AWS_REGION });

export const handler: Handler = async (event: S3CreateEvent) => {
    try {
        const record = event.Records[0]!;
        const bucket = record.s3.bucket.name;
        const fileKey = record.s3.object.key;

        // Extract imageId from fileKey
        const imageId = fileKey.split("/")[1];
        if (!imageId) {
            return console.error("Invalid fileKey");
        }

        // Retrieve metadata from DynamoDB
        const { Items } = await docClient.send(new QueryCommand({
            TableName: process.env.IMAGES_TABLE_NAME,
            KeyConditionExpression: "imageId = :imageId",
            FilterExpression: "attribute_not_exists(#ttl) OR #ttl > :now",
            ExpressionAttributeValues: { ":imageId": imageId, ":now": Math.floor(Date.now() / 1000) },
            ScanIndexForward: false,
            Limit: 1,
        }));
        if (!Items || Items.length === 0) {
            return console.error("Metadata not found");
        }
        const { uploadedAt, userId } = Items[0]!;

        console.log("Metadata found, processing image...");

        // Detect labels with Rekognition
        const labelsRes = await rekognition.send(new DetectLabelsCommand({
            Image: {
                S3Object: {
                    Bucket: bucket,
                    Name: fileKey
                },
            },
            MaxLabels: 10,
            MinConfidence: 75
        }));
        const labels = labelsRes.Labels?.map(label => label.Name || 'Default') || [];

        const assignedCategory = labels.map(label => CATEGORY_MAPPING[label] || "Uncategorized").find(Boolean) || "Uncategorized";

        // Index in Rekognition collection (to later search for similar faces)
        const faceIndexRes = await rekognition.send(new IndexFacesCommand({
            CollectionId: process.env.REKOGNITION_COLLECTION_ID,
            Image: {
                S3Object: {
                    Bucket: bucket,
                    Name: fileKey
                },
            },
            ExternalImageId: imageId,
        }));
        const rekognitionId = faceIndexRes.FaceRecords?.[0]?.Face?.FaceId || null;

        // Update metadata in DynamoDB (add fileUrl, RekognitionId and labels, remove TTL)
        await docClient.send(new UpdateCommand({
            TableName: process.env.IMAGES_TABLE_NAME,
            Key: { imageId, uploadedAt },
            UpdateExpression: "REMOVE #ttl SET fileUrl = :fileUrl, rekognitionId = :rekognitionId, labels = :labels, category = :category",
            ExpressionAttributeNames: { "#ttl": "ttl" },
            ExpressionAttributeValues: {
                ":fileUrl": `https://${bucket}.s3.amazonaws.com/${fileKey}`,
                ":rekognitionId": rekognitionId,
                ":labels": labels,
                ":category": assignedCategory,
            },
        }));

        // Update user's uploadedImages in DynamoDB
        await docClient.send(new UpdateCommand({
            TableName: process.env.USERS_TABLE_NAME,
            Key: { userId },
            UpdateExpression: "SET uploadedImages = if_not_exists(uploadedImages, :zero) + :inc",
            ExpressionAttributeValues: {
                ":inc": 1,
                ":zero": 0
            }
        }));

        // Add label items to DynamoDB
        await docClient.send(new BatchWriteCommand({
            RequestItems: {
                [process.env.LABELS_TABLE_NAME]: labels.map(label => ({
                    PutRequest: {
                        Item: {
                            label,
                            imageId,
                        }
                    }
                }))
            }
        }));

        console.log(`Image ${imageId} processed successfully`);
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error" }),
        };
    }
};