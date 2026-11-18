import { Plus, X } from "lucide-react";
import { getImageUrl } from "../../../utils/imageUrl";

export default function MealVisuals({
  mealName,
  existingImages,
  removeImages,
  files,
  filePreviews,
  onRemoveExisting,
  onRemoveFile,
  onFilesSelected,
}) {
  const visibleImages = existingImages.filter((image) => !removeImages.includes(image.url));
  const imageCount = visibleImages.length + files.length;
  const atLimit = imageCount >= 5;

  return (
    <section className="meal-editor-card">
      <h2>Meal Visuals <small>{imageCount} / 5 images · min 1</small></h2>
      <div className="meal-image-grid">
        {visibleImages.map((image) => (
          <div className="meal-image-tile" key={image.url}>
            <img src={getImageUrl(image.url)} alt={image.alt || mealName} />
            <button type="button" aria-label="Remove image" onClick={() => onRemoveExisting(image.url)}>
              <X size={14} />
            </button>
          </div>
        ))}
        {files.map((file, index) => (
          <div className="meal-image-tile" key={`${file.name}-${file.lastModified}-${index}`}>
            <img src={filePreviews[index]} alt={file.name} />
            <button type="button" aria-label="Remove selected image" onClick={() => onRemoveFile(index)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <label className={`meal-upload-box ${atLimit ? "disabled" : ""}`}>
        <Plus size={18} />
        <span>Add meal images</span>
        <small>JPG, PNG or WebP · 1–5 images required</small>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          disabled={atLimit}
          onChange={(event) => {
            onFilesSelected(Array.from(event.target.files || []));
            event.target.value = "";
          }}
        />
      </label>
      {files.length > 0 && (
        <small className="meal-files-selected">
          {files.length} new image{files.length > 1 ? "s" : ""} cropped and resized to 1200 × 1200 WebP.
        </small>
      )}
    </section>
  );
}
