interface ImageMetadata {
    imageId: string;
    userId: string;
    uploadedAt: number;
    authorUsername: string;
    imageTitle: string;
    imageDescription: string;
    rekognitionId?: string;
    rekognitionLabels?: string[];
    fileUrl?: string;
    ttl?: number;
}

interface LabelData {
    label: string;
    imageId: string;
}