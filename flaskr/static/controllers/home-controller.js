Stimulus.register(
  "home",
  class extends Controller {
    initialize() {
      this.fileUploadInput = document.createElement("input");
      this.fileUploadInput.type = "file";
      this.fileUploadInput.accept = "video/mp4";
      this.fileUploadInput.addEventListener("change", () => {
        this.handleUpload();
      });
    }

    handleUpload() {
      const file = this.fileUploadInput.files?.item(0);
      const blobUrl = URL.createObjectURL(file);
      localStorage.setItem(
        "prepare_page_target",
        JSON.stringify({
          upload_file: blobUrl,
          file_name: file.name,
        }),
      );
      Turbo.visit("/dance");
    }

    upload() {
      this.fileUploadInput.click();
    }
  },
);
