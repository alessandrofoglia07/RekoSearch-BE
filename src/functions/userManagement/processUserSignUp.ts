import { Handler, PreSignUpTriggerEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = new DynamoDBClient({ region: process.env.SERVERLESS_AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddb);

export const handler: Handler = async (event: PreSignUpTriggerEvent) => {
    try {
        // get user id, username and email from event
        const { sub, email, username } = event.request.userAttributes;

        if (!sub || !email || !username) {
            throw new Error("Missing required attributes in the user pool");
        }

        const user: UserData = {
            userId: sub,
            username,
            email,
            profileImageUrl: "",
            bio: "",
            followers: [],
            following: [],
            likedImages: [],
            uploadedImages: 0,
            views: 0,
            likes: 0
        };

        // add user to the database
        await ddbDocClient.send(new PutCommand({
            TableName: process.env.USERS_TABLE_NAME,
            Item: user
        }));

        return event;
    } catch (err) {
        console.log(err);
        throw err;
    }
};