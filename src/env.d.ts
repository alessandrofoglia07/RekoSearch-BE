declare global {
    namespace NodeJS {
        interface ProcessEnv {
            readonly SERVERLESS_AWS_REGION: string;
            readonly CLIENT_URL: string;
            readonly IMAGES_BUCKET_NAME: string;
            readonly REKOGNITION_COLLECTION_ID: string;
            readonly IMAGES_TABLE_NAME: string;
            readonly LABELS_TABLE_NAME: string;
            readonly COGNITO_USER_POOL: string;
            readonly COGNITO_USER_POOL_CLIENT: string;
        }
    }
}

export { };