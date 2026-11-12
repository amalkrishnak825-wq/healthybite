import { useEffect, useRef, useState } from "react";

export default function useMealImages({ existingImages, removeImages, onError }) {
  const cropImageRef = useRef(null);
  const cropperRef = useRef(null);
  const previewUrlsRef = useRef(new Set());
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [cropQueue, setCropQueue] = useState([]);
  const [cropIndex, setCropIndex] = useState(0);
  const [cropperReady, setCropperReady] = useState(false);
  const [cropSource, setCropSource] = useState("");

  useEffect(() => {
    if (cropQueue.length) return undefined;
    cropperRef.current?.destroy();
    cropperRef.current = null;
    return undefined;
  }, [cropQueue.length]);

  useEffect(() => () => {
    cropperRef.current?.destroy();
    cropperRef.current = null;
    previewUrlsRef.current.forEach(URL.revokeObjectURL);
    previewUrlsRef.current.clear();
  }, []);

  function createPreviewUrl(file) {
    const url = URL.createObjectURL(file);
    previewUrlsRef.current.add(url);
    return url;
  }

  function revokePreviewUrl(url) {
    if (!url || !previewUrlsRef.current.has(url)) return;
    URL.revokeObjectURL(url);
    previewUrlsRef.current.delete(url);
  }

  function addImageFiles(selected) {
    const keptCount = existingImages.filter((image) => !removeImages.includes(image.url)).length;
    const remaining = Math.max(0, 5 - keptCount - files.length - cropQueue.length);
    const validFiles = selected.filter((file) => file.type.startsWith("image/"));
    const accepted = validFiles.slice(0, remaining);
    if (validFiles.length > remaining) onError("A meal can have at most 5 images.");
    if (!accepted.length) return;

    cropperRef.current?.destroy();
    cropperRef.current = null;
    setCropperReady(false);
    revokePreviewUrl(cropSource);
    setCropSource(createPreviewUrl(accepted[0]));
    setCropQueue(accepted);
    setCropIndex(0);
  }

  function initializeCropper(event) {
    const image = event.currentTarget;
    setCropperReady(false);
    cropperRef.current?.destroy();
    cropperRef.current = null;
    import("cropperjs")
      .then(({ default: Cropper }) => {
        if (!image.isConnected) return;
        cropperRef.current = new Cropper(image, {
          aspectRatio: 1,
          viewMode: 1,
          dragMode: "move",
          autoCropArea: 0.9,
          responsive: true,
          background: false,
          guides: false,
          center: true,
          highlight: false,
          movable: true,
          cropBoxMovable: false,
          cropBoxResizable: false,
          toggleDragModeOnDblclick: false,
          ready: () => setCropperReady(true),
        });
      })
      .catch(() => onError("Could not open the image cropper. Please try another image."));
  }

  async function applyCurrentCrop() {
    const sourceFile = cropQueue[cropIndex];
    const canvas = cropperRef.current?.getCroppedCanvas({
      width: 1200,
      height: 1200,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });
    if (!sourceFile || !canvas) return;

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.88));
    if (!blob) {
      onError("Could not crop this image. Please try another image.");
      return;
    }

    const cropped = new File(
      [blob],
      `${sourceFile.name.replace(/\.[^.]+$/, "")}.webp`,
      { type: "image/webp" },
    );
    setFiles((current) => [...current, cropped]);
    setFilePreviews((current) => [...current, createPreviewUrl(cropped)]);

    if (cropIndex + 1 < cropQueue.length) {
      cropperRef.current?.destroy();
      cropperRef.current = null;
      setCropperReady(false);
      const nextIndex = cropIndex + 1;
      revokePreviewUrl(cropSource);
      setCropSource(createPreviewUrl(cropQueue[nextIndex]));
      setCropIndex(nextIndex);
      return;
    }

    revokePreviewUrl(cropSource);
    setCropSource("");
    setCropQueue([]);
    setCropIndex(0);
  }

  function cancelCrop() {
    cropperRef.current?.destroy();
    cropperRef.current = null;
    revokePreviewUrl(cropSource);
    setCropSource("");
    setCropperReady(false);
    setCropQueue([]);
    setCropIndex(0);
  }

  function removeSelectedFile(index) {
    revokePreviewUrl(filePreviews[index]);
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setFilePreviews((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  return {
    cropImageRef,
    cropperRef,
    files,
    filePreviews,
    cropQueue,
    cropIndex,
    cropperReady,
    cropSource,
    addImageFiles,
    initializeCropper,
    applyCurrentCrop,
    cancelCrop,
    removeSelectedFile,
  };
}
