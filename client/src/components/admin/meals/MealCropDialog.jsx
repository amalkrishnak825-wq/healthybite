import { Minus, Plus, X } from "lucide-react";

export default function MealCropDialog({
  cropImageRef,
  cropperRef,
  source,
  ready,
  index,
  count,
  onImageLoad,
  onCancel,
  onApply,
}) {
  if (!count) return null;

  return (
    <div className="meal-crop-backdrop" role="presentation">
      <section className="meal-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="meal-crop-title">
        <div className="meal-crop-heading">
          <div>
            <h2 id="meal-crop-title">Adjust meal photo</h2>
            <p>{index + 1} of {count} · drag or pinch to frame your meal.</p>
          </div>
          <button type="button" aria-label="Cancel image crop" onClick={onCancel}><X size={18} /></button>
        </div>
        <div className="meal-crop-preview">
          <img ref={cropImageRef} src={source} alt="Crop preview" onLoad={onImageLoad} />
        </div>
        <div className="meal-crop-zoom" aria-label="Photo zoom controls">
          <button type="button" aria-label="Zoom out" disabled={!ready} onClick={() => cropperRef.current?.zoom(-0.1)}>
            <Minus size={17} />
          </button>
          <span>Pinch or zoom</span>
          <button type="button" aria-label="Zoom in" disabled={!ready} onClick={() => cropperRef.current?.zoom(0.1)}>
            <Plus size={17} />
          </button>
        </div>
        <p className="meal-crop-help">Square crop · drag to reposition · pinch to zoom</p>
        <div className="meal-crop-actions">
          <button type="button" className="meal-cancel-button" onClick={onCancel}>Cancel</button>
          <button type="button" className="meal-save-button" disabled={!ready} onClick={onApply}>
            {ready ? index + 1 < count ? "Crop & Next" : "Crop & Add" : "Preparing crop…"}
          </button>
        </div>
      </section>
    </div>
  );
}
