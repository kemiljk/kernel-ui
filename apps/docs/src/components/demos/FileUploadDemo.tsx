import { FileUpload } from "@kernelui-lib/react";

export default function FileUploadDemo() {
  return (
    <FileUpload
      label="Upload files"
      description="PNG or JPG, up to 5MB"
      accept="image/png,image/jpeg"
      maxSize={5 * 1024 * 1024}
      multiple
    />
  );
}
