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
    labels?: string[];
    fileUrl?: string;
    ttl?: number;
}

interface LabelData {
    label: string;
    imageId: string;
}

interface UserData {
    userId: string;
    username: string;
    email: string;
    profileImageUrl: string;
    bio: string;
    followers: string[]; // userIds
    following: string[]; // userIds
    likedImages: string[]; // imageIds
    uploadedImages: number;
    views: number;
    likes: number;
}