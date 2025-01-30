interface ImageMetadata {
    imageId: string;
    userId: string;
    uploadedAt: number;
    authorUsername: string;
    imageTitle: string;
    imageDescription: string;
    category: string; // 'uncategorized' if not specified
    views: number;
    likes: string[]; // userIds
    labels: string[];
    rekognitionId?: string;
    rekognitionLabels?: string[];
    fileUrl?: string;
    ttl?: number;
}

interface LabelData {
    label: string;
    imageId: string;
}