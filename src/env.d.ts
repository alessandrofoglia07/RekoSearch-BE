declare global {
    namespace NodeJS {
        interface ProcessEnv {
            readonly SERVERLESS_AWS_REGION: string;
            readonly CLIENT_URL: string;
            readonly IMAGES_BUCKET_NAME: string;
        }
    }
}

export { };