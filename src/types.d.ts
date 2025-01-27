interface ImageMetadata {
    imageId: string;
    userId: string;
    uploadedAt: string;
    imageTitle: string;
    imageDescription: string;
    fileUrl: string;
}

interface LabelData {
    label: string;
    imageId: string;
}