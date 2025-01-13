/**
 * Function to handle new video upload
 * wherein the uploaded video is not sent
 * to the server immediately but rather
 * deferred for the prepare page to upload
 * to make it look fast and also show a
 * uploading spinner
 *
 * @param {Event} event
 */
function handleVideoUpload(event) {
  /** @type HTMLInputElement */
  const input = event.target;
  const file = input.files?.item(0);

  if (!file) return;

  // pass the blob to the prepare page to handle
  const blobUrl = URL.createObjectURL(file);
  localStorage.setItem(
    "prepare_page_target",
    JSON.stringify({
      file: blobUrl,
    }),
  );

  Turbo.visit("/dance");
}

document.addEventListener("turbo:load", () => {
  /** @type HTMLInputElement? */
  const uploadInput = document.getElementById("video-upload");
  if (uploadInput) uploadInput.addEventListener("change", handleVideoUpload);
});
