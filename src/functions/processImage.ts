import { Handler, S3CreateEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { DetectLabelsCommand, IndexFacesCommand, RekognitionClient } from '@aws-sdk/client-rekognition';

const ddb = new DynamoDBClient({ region: process.env.SERVERLESS_AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddb);
const rekognition = new RekognitionClient({ region: process.env.SERVERLESS_AWS_REGION });

export const handler: Handler = async (event: S3CreateEvent) => {
    try {
        const record = event.Records[0];
        const bucket = record!.s3.bucket.name;
        const fileKey = record!.s3.object.key;

        // Extract imageId from fileKey
        const imageId = fileKey.split("/")[1];
        if (!imageId) {
            return console.error("Invalid fileKey");
        }

        // Retrieve metadata from DynamoDB
        const { Item: metadata } = await docClient.send(new GetCommand({
            TableName: process.env.IMAGES_TABLE_NAME,
            Key: { imageId },
        }));
        if (!metadata) {
            return console.error("Metadata not found");
        }
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
        const labels = labelsRes.Labels?.map(label => label.Name) || [];

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
            Key: { imageId },
            UpdateExpression: "REMOVE #ttl SET fileUrl = :fileUrl, rekognitionId = :rekognitionId, labels = :labels",
            ExpressionAttributeNames: { "#ttl": "ttl" },
            ExpressionAttributeValues: {
                ":fileUrl": `https://${bucket}.s3.amazonaws.com/${fileKey}`,
                ":rekognitionId": rekognitionId,
                ":labels": labels,
            },
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