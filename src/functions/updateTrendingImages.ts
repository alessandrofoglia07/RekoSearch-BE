import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { CATEGORY_MAPPING } from "../utils/categoryMapping";

const ddb = new DynamoDBClient({ region: process.env.SERVERLESS_AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddb);

export const handler = async () => {
    try {
        // Retrieve current trending images
        const { Items: previousTrendingImages } = await ddbDocClient.send(new QueryCommand({
            TableName: process.env.IMAGES_TABLE_NAME,
            IndexName: "category-uploadedAt-index",
            KeyConditionExpression: "#category = :category",
            ExpressionAttributeNames: { "#category": "category" },
            ExpressionAttributeValues: { ":category": "trending" }
        }));

        // Update the category of previous trending images
        await Promise.all((previousTrendingImages || []).map(async (image) => {
            const newCategory = (image as ImageMetadata).labels.map(label => CATEGORY_MAPPING[label] || "Uncategorized").find(Boolean) || "Uncategorized";
            await ddbDocClient.send(new UpdateCommand({
                TableName: process.env.IMAGES_TABLE_NAME,
                Key: { imageId: image.imageId },
                UpdateExpression: "SET category = :category",
                ExpressionAttributeValues: { ":category": newCategory }
            }));
        }));

        // Retrieve all images
        const { Items: images } = await ddbDocClient.send(new ScanCommand({
            TableName: process.env.IMAGES_TABLE_NAME,
            ProjectionExpression: "imageId, likes, views"
        }));

        type Image = {
            imageId: string,
            likes: string[],
            views: number;
        };

        // Sort images by engagement and select top 25
        const trendingImages = (images as Image[]).sort((a, b) => {
            const aScore = a.likes.length + 0.5 * a.views;
            const bScore = b.likes.length + 0.5 * b.views;
            return bScore - aScore;
        }).slice(0, 25);

        // Update the category of trending images
        await Promise.all(trendingImages?.map(async (image) => {
            await ddbDocClient.send(new UpdateCommand({
                TableName: process.env.IMAGES_TABLE_NAME,
                Key: { imageId: image.imageId },
                UpdateExpression: "SET category = :category",
                ExpressionAttributeValues: { ":category": "trending" }
            }));
        }));

        console.log("Trending images updated successfully");
    } catch (err) {
        console.error("Error updating trending images", err);
    }
};